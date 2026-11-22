// Test rantai disposisi end-to-end (butuh server jalan di :3000 + DB fresh `npm run db:init`)
// npm test
const BASE = 'http://localhost:3000/api'

let fails = 0
const ok = (cond, label) => {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + label)
  if (!cond) fails++
}

const client = () => {
  let cookie = ''
  return async (path, opts = {}) => {
    const r = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
      credentials: 'omit',
      ...opts,
    })
    const sc = r.headers.get('set-cookie')
    if (sc) cookie = sc.split(';')[0]
    const d = await r.json().catch(() => ({}))
    return { status: r.status, body: d }
  }
}

const main = async () => {
  const c = client()

  // 1. login sekper
  const lg = await c('/login', { method: 'POST', body: JSON.stringify({ username: 'rahman', password: 'rahman' }) })
  ok(lg.status === 200 && lg.body.role === 'sekper', 'login sekper')

  // 2. buat draft + kirim ke andi (id 2)
  const cr = await c('/agenda', { method: 'POST', body: JSON.stringify({ judul: 'TEST Rantai', tanggal: '2099-07-01', jam: '09:00', lokasi: 'Test', catatan: '', peserta: [2], kirim: false }) })
  ok(cr.status === 200, 'buat draft')
  const id = cr.body.id
  const kr = await c(`/agenda/${id}/kirim`, { method: 'POST', body: JSON.stringify({ peserta: [2] }) })
  ok(kr.status === 200, 'kirim draft')

  // 3. andi alih ke sari (id 3)
  const ca = client()
  await ca('/login', { method: 'POST', body: JSON.stringify({ username: 'andi', password: 'andi' }) })
  const det = await ca(`/agenda/${id}`)
  const andiNode = det.body.chain.find((n) => n.user_id === 2)
  const al = await ca(`/agenda/peserta/${andiNode.id}/alih`, { method: 'POST', body: JSON.stringify({ pengganti_id: 3, alasan: 'test alasan' }) })
  ok(al.status === 200, 'andi alih ke sari')

  // 4. urutan rantai = traversal: andi -> sari; pemegang = sari
  const det2 = await ca(`/agenda/${id}`)
  ok(det2.body.pemegang && det2.body.pemegang.nama === 'Sari Wulandari', 'pemegang = Sari')
  ok(det2.body.chain[0].user_id === 2 && det2.body.chain[1].user_id === 3, 'urutan rantai traversal benar')

  // 5. anti-loop: sari tidak bisa alih kembali ke andi (login sari)
  const sa = client()
  await sa('/login', { method: 'POST', body: JSON.stringify({ username: 'sari', password: 'sari' }) })
  const det2b = await sa(`/agenda/${id}`)
  const sariNode = det2b.body.chain.find((n) => n.user_id === 3)
  const loop = await sa(`/agenda/peserta/${sariNode.id}/alih`, { method: 'POST', body: JSON.stringify({ pengganti_id: 2, alasan: 'x' }) })
  ok(loop.status === 409, 'anti-loop 409 saat alih ke user di rantai')

  // 6. pengganti exclude cuti (rian id 5) & diri (andi id 2)
  const pg = await sa('/users/pengganti')
  ok(!pg.body.some((u) => u.id === 5), 'pengganti exclude cuti')
  ok(!pg.body.some((u) => u.id === 3), 'pengganti exclude diri')

  // 7. sari tolak -> rantai berhenti, notif ditolak ke sekper
  const tk = await sa(`/agenda/peserta/${sariNode.id}/tolak`, { method: 'POST', body: JSON.stringify({ alasan: 'test tolak' }) })
  ok(tk.status === 200, 'sari tolak')
  const det3 = await sa(`/agenda/${id}`)
  ok(!det3.body.pemegang, 'rantai mentok (tanpa pemegang)')
  const cs = client()
  await cs('/login', { method: 'POST', body: JSON.stringify({ username: 'rahman', password: 'rahman' }) })
  const nt = await cs('/notifikasi')
  ok(nt.body.items.some((n) => n.tipe === 'ditolak' && n.agenda_id === id), 'notif ditolak ke sekper')

  // 8. paksa titik ke dewi (id 6)
  const pk = await cs(`/agenda/${id}/paksa`, { method: 'POST', body: JSON.stringify({ user_id: 6 }) })
  ok(pk.status === 200, 'paksa titik ke dewi')
  const det4 = await cs(`/agenda/${id}`)
  ok(det4.body.pemegang && det4.body.pemegang.nama === 'Dewi Lestari', 'pemegang = Dewi setelah paksa')

  // 8b. dewi klik hadir -> terkonfirmasi = Dewi Lestari, status agenda tetap aktif (mendatang) sebelum jadwal lewat
  const cd = client()
  await cd('/login', { method: 'POST', body: JSON.stringify({ username: 'dewi', password: 'dewi' }) })
  const dewiNode = det4.body.chain.find((n) => n.user_id === 6)
  const hd = await cd(`/agenda/peserta/${dewiNode.id}/hadir`, { method: 'POST' })
  ok(hd.status === 200, 'dewi klik hadir')
  const ls = await cs('/agenda')
  const row = ls.body.find((x) => x.id === id)
  ok(row && row.terkonfirmasi === 'Dewi Lestari' && row.status === 'aktif', 'pemegang terkonfirmasi tetap tampil & status belum selesai sebelum jadwal')

  // 9. cleanup: batal agenda test
  const bl = await cs(`/agenda/${id}/batal`, { method: 'POST' })
  ok(bl.status === 200, 'batal agenda test (cleanup)')

  console.log(fails === 0 ? '\nSEMUA PASS' : `\n${fails} FAIL`)
  process.exit(fails === 0 ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(1) })
