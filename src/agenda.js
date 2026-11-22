import { Router } from 'express'
import { q } from './db.js'
import { mustLogin, sekperOnly } from './auth.js'
import { kirimNotif } from './notif.js'

const r = Router()

async function loadAgenda(id) {
  const [[a]] = await q(`SELECT a.*, u.nama AS pembuat FROM agenda a
    JOIN users u ON u.id=a.dibuat_oleh WHERE a.id=?`, [id])
  return a || null
}
async function chain(id) {
  const [rows] = await q(`SELECT p.id, p.agenda_id, p.user_id, p.status, p.alasan, p.alih_ke_id,
    p.waktu_respon, u.nama, u.role
    FROM peserta_agenda p JOIN users u ON u.id=p.user_id WHERE p.agenda_id=? ORDER BY p.id`, [id])
  // urutan rantai: mulai dari node yang tidak jadi tujuan alihan siapa pun (head), ikuti alih_ke_id
  const byId = new Map(rows.map(r => [r.id, r]))
  const targets = new Set(rows.map(r => r.alih_ke_id).filter(Boolean))
  const heads = rows.filter(r => !targets.has(r.id))
  const ordered = []
  for (const h of heads) {
    let cur = h
    while (cur) {
      ordered.push(cur)
      cur = cur.alih_ke_id ? byId.get(cur.alih_ke_id) : null
    }
  }
  for (const r of rows) if (!ordered.includes(r)) ordered.push(r) // safety: rantai rusak
  return ordered
}
async function pemegang(id) {
  const [[row]] = await q(`SELECT p.*, u.nama, u.role FROM peserta_agenda p
    JOIN users u ON u.id=p.user_id
    WHERE p.agenda_id=? AND p.status='menunggu' ORDER BY p.id DESC LIMIT 1`, [id])
  return row || null
}
async function bisaLihat(user, id) {
  if (user.role === 'sekper') return true
  const [[x]] = await q('SELECT id FROM peserta_agenda WHERE agenda_id=? AND user_id=?', [id, user.id])
  return !!x
}

// ---- list ----
r.get('/', mustLogin, async (req, res) => {
  const u = req.session.user
  const { filter = 'semua', q: term } = req.query
  let where, wparams = []
  if (u.role === 'sekper') {
    where = 'a.status IN (\'draft\',\'aktif\',\'selesai\')'
  } else {
    // aktif selalu tampil; yang sudah disetujui (selesai) tetap tampil sampai H+1 (keesokan hari tanggal agenda)
    where = `(a.status='aktif' OR (a.status='selesai' AND a.tanggal >= CURDATE() - INTERVAL 1 DAY))
      AND EXISTS(SELECT 1 FROM peserta_agenda px WHERE px.agenda_id=a.id AND px.user_id=?)`
    wparams = [u.id]
  }
  if (filter === 'minggu') { where += ' AND a.tanggal BETWEEN CURDATE() AND CURDATE()+INTERVAL 6 DAY' }
  if (filter === 'bulan') { where += ' AND YEAR(a.tanggal)=YEAR(CURDATE()) AND MONTH(a.tanggal)=MONTH(CURDATE())' }
  let params = [u.id, ...wparams]
  let sql = `SELECT a.id,a.judul,a.tanggal,a.jam,a.lokasi,a.status,a.catatan,u.nama AS pembuat,
    (SELECT p.status FROM peserta_agenda p WHERE p.agenda_id=a.id AND p.user_id=? ORDER BY p.id DESC LIMIT 1) AS status_saya,
    (SELECT pu.nama FROM peserta_agenda p JOIN users pu ON pu.id=p.user_id
      WHERE p.agenda_id=a.id AND p.status='menunggu' ORDER BY p.id DESC LIMIT 1) AS pemegang,
    (SELECT pu.nama FROM peserta_agenda p JOIN users pu ON pu.id=p.user_id
      WHERE p.agenda_id=a.id AND p.status='hadir' ORDER BY p.id DESC LIMIT 1) AS terkonfirmasi,
    (SELECT COUNT(*) FROM peserta_agenda p WHERE p.agenda_id=a.id AND p.status='hadir') AS n_hadir,
    (SELECT COUNT(*) FROM peserta_agenda p WHERE p.agenda_id=a.id AND p.status='tidak_hadir') AS n_alih
    FROM agenda a JOIN users u ON u.id=a.dibuat_oleh WHERE ${where}`
  if (term) { sql += ' AND a.judul LIKE ?'; params.push('%' + term + '%') }
  sql += ' ORDER BY a.tanggal DESC, a.jam DESC'
  const [rows] = await q(sql, params)
  res.json(rows)
})

// ---- detail + trace rantai ----
r.get('/:id', mustLogin, async (req, res) => {
  const a = await loadAgenda(req.params.id)
  if (!a) return res.status(404).json({ error: 'agenda tidak ditemukan' })
  if (a.status === 'draft' && req.session.user.role !== 'sekper')
    return res.status(404).json({ error: 'agenda tidak ditemukan' })
  if (!(await bisaLihat(req.session.user, a.id)))
    return res.status(403).json({ error: 'bukan agenda Anda' })
  res.json({
    agenda: a,
    chain: await chain(a.id),
    pemegang: await pemegang(a.id),
  })
})

// ---- buat (draft atau langsung kirim) ----
r.post('/', mustLogin, sekperOnly, async (req, res) => {
  const { judul, tanggal, jam, lokasi, catatan, peserta = [], kirim = false } = req.body || {}
  if (!judul || !tanggal || !jam) return res.status(400).json({ error: 'judul, tanggal, jam wajib' })
  if (kirim && peserta.length === 0) return res.status(400).json({ error: 'pilih minimal satu peserta sebelum kirim' })
  const [x] = await q(`INSERT INTO agenda (judul,tanggal,jam,lokasi,catatan,dibuat_oleh,status) VALUES (?,?,?,?,?,?,?)`,
    [judul, tanggal, jam, lokasi || null, catatan || null, req.session.user.id, kirim ? 'aktif' : 'draft'])
  if (kirim) {
    for (const pid of peserta) {
      await q('INSERT INTO peserta_agenda (agenda_id,user_id) VALUES (?,?)', [x.insertId, pid])
      await kirimNotif(pid, x.insertId, 'agenda_baru')
    }
  }
  res.json({ id: x.insertId })
})

// ---- kirim draft ----
r.post('/:id/kirim', mustLogin, sekperOnly, async (req, res) => {
  const a = await loadAgenda(req.params.id)
  if (!a) return res.status(404).json({ error: 'agenda tidak ditemukan' })
  if (a.status !== 'draft') return res.status(400).json({ error: 'bukan draft' })
  const { peserta = [] } = req.body || {}
  if (peserta.length === 0) return res.status(400).json({ error: 'pilih minimal satu peserta sebelum kirim' })
  for (const pid of peserta) {
    await q(`INSERT INTO peserta_agenda (agenda_id,user_id) VALUES (?,?)
      ON DUPLICATE KEY UPDATE agenda_id=agenda_id`, [a.id, pid]) // idempotent: peserta mungkin sudah masuk via edit draft
    await kirimNotif(pid, a.id, 'agenda_baru')
  }
  await q('UPDATE agenda SET status=\'aktif\' WHERE id=?', [a.id])
  res.json({ ok: true })
})

// ---- edit (ubah tanggal/jam saat aktif -> notif ulang ke pemegang aktif) ----
r.put('/:id', mustLogin, sekperOnly, async (req, res) => {
  const a = await loadAgenda(req.params.id)
  if (!a) return res.status(404).json({ error: 'agenda tidak ditemukan' })
  const { judul, tanggal, jam, lokasi, catatan, peserta } = req.body || {}
  await q(`UPDATE agenda SET judul=COALESCE(?,judul), tanggal=COALESCE(?,tanggal),
    jam=COALESCE(?,jam), lokasi=COALESCE(?,lokasi), catatan=COALESCE(?,catatan) WHERE id=?`,
    [judul, tanggal, jam, lokasi, catatan, a.id])
  const jadwalBerubah = (tanggal && tanggal !== a.tanggal) || (jam && String(jam) !== String(a.jam))
  if (a.status === 'aktif' && jadwalBerubah) {
    const pg = await pemegang(a.id)
    if (pg) await kirimNotif(pg.user_id, a.id, 'h1')
  }
  // draft: sinkronkan daftar peserta (belum ada rantai, tanpa notif)
  if (a.status === 'draft' && Array.isArray(peserta)) {
    await q('DELETE FROM peserta_agenda WHERE agenda_id=?', [a.id])
    for (const pid of peserta) {
      await q('INSERT INTO peserta_agenda (agenda_id,user_id) VALUES (?,?)', [a.id, pid])
    }
  }
  res.json({ ok: true })
})

// ---- hapus agenda (sekper, bisa multi id sekaligus) ----
r.post('/hapus', mustLogin, sekperOnly, async (req, res) => {
  const { ids = [] } = req.body || {}
  const list = ids.filter((x) => Number.isInteger(x))
  if (list.length === 0) return res.status(400).json({ error: 'pilih agenda yang akan dihapus' })
  for (const id of list) {
    await q('DELETE FROM notifikasi WHERE agenda_id=?', [id])
    await q('DELETE FROM peserta_agenda WHERE agenda_id=?', [id])
    await q('DELETE FROM agenda WHERE id=?', [id])
  }
  res.json({ ok: true, n: list.length })
})

// ---- batal (sekper) ----
r.post('/:id/batal', mustLogin, sekperOnly, async (req, res) => {
  await q('UPDATE agenda SET status=\'batal\' WHERE id=?', [req.params.id])
  res.json({ ok: true })
})

// ---- paksa titik (pagar #3: rantai mentok) ----
r.post('/:id/paksa', mustLogin, sekperOnly, async (req, res) => {
  const a = await loadAgenda(req.params.id)
  if (!a) return res.status(404).json({ error: 'agenda tidak ditemukan' })
  const { user_id } = req.body || {}
  const [[u]] = await q('SELECT * FROM users WHERE id=?', [user_id])
  if (!u || u.status !== 'aktif') return res.status(400).json({ error: 'user tidak aktif' })
  const [[dupe]] = await q('SELECT id FROM peserta_agenda WHERE agenda_id=? AND user_id=?', [a.id, user_id])
  if (dupe) return res.status(409).json({ error: 'user sudah ada di rantai agenda ini' })
  await q('INSERT INTO peserta_agenda (agenda_id,user_id) VALUES (?,?)', [a.id, user_id])
  await kirimNotif(user_id, a.id, 'paksa')
  res.json({ ok: true })
})

// ---- kirim notif manual ke semua peserta agenda (sekper) ----
r.post('/:id/notif', mustLogin, sekperOnly, async (req, res) => {
  const a = await loadAgenda(req.params.id)
  if (!a) return res.status(404).json({ error: 'agenda tidak ditemukan' })
  if (a.status !== 'aktif') return res.status(400).json({ error: 'hanya agenda aktif' })
  const [rows] = await q('SELECT DISTINCT user_id FROM peserta_agenda WHERE agenda_id=?', [a.id])
  for (const r of rows) await kirimNotif(r.user_id, a.id, 'pengingat')
  res.json({ ok: true, n: rows.length })
})

// ---- aksi responder (pada node sendiri yang masih menunggu) ----
async function myRow(req, res) {
  const [[p]] = await q(`SELECT p.* FROM peserta_agenda p JOIN agenda a ON a.id=p.agenda_id
    WHERE p.id=? AND p.user_id=? AND p.status='menunggu' AND a.status='aktif'`,
    [req.params.id, req.session.user.id])
  if (!p) { res.status(404).json({ error: 'tugas tidak ditemukan / sudah dijawab' }); return null }
  return p
}
r.post('/peserta/:id/hadir', mustLogin, async (req, res) => {
  const p = await myRow(req, res); if (!p) return
  await q('UPDATE peserta_agenda SET status=\'hadir\', waktu_respon=NOW() WHERE id=?', [p.id])
  // status agenda tetap 'aktif': label "Mendatang/Selesai" diturunkan dari waktu (cron flip aktif->selesai saat lewat)
  res.json({ ok: true })
})
r.post('/peserta/:id/alih', mustLogin, async (req, res) => {
  const p = await myRow(req, res); if (!p) return
  const { pengganti_id, alasan } = req.body || {}
  if (!pengganti_id || !alasan || !alasan.trim()) return res.status(400).json({ error: 'pengganti dan alasan wajib' })
  const [[g]] = await q('SELECT id, status FROM users WHERE id=?', [pengganti_id])
  if (!g || g.status !== 'aktif') return res.status(400).json({ error: 'pengganti tidak aktif' })
  const [[dupe]] = await q('SELECT id FROM peserta_agenda WHERE agenda_id=? AND user_id=?', [p.agenda_id, pengganti_id])
  if (dupe) return res.status(409).json({ error: 'user sudah ada di rantai agenda ini' })
  const [nx] = await q('INSERT INTO peserta_agenda (agenda_id,user_id) VALUES (?,?)', [p.agenda_id, pengganti_id])
  await q(`UPDATE peserta_agenda SET status='tidak_hadir', alasan=?, alih_ke_id=?, waktu_respon=NOW() WHERE id=?`,
    [alasan.trim(), nx.insertId, p.id])
  const [[me]] = await q('SELECT nama FROM users WHERE id=?', [req.session.user.id])
  await kirimNotif(pengganti_id, p.agenda_id, 'alihan', { dari: me.nama })
  res.json({ ok: true })
})
r.post('/peserta/:id/tolak', mustLogin, async (req, res) => {
  const p = await myRow(req, res); if (!p) return
  const { alasan } = req.body || {}
  await q(`UPDATE peserta_agenda SET status='ditolak', alasan=?, waktu_respon=NOW() WHERE id=?`,
    [alasan?.trim() || null, p.id])
  const [[a]] = await q('SELECT dibuat_oleh FROM agenda WHERE id=?', [p.agenda_id])
  const [[me]] = await q('SELECT nama FROM users WHERE id=?', [req.session.user.id])
  await kirimNotif(a.dibuat_oleh, p.agenda_id, 'ditolak', { nama: me.nama })
  res.json({ ok: true })
})

export default r
