import { Router } from 'express'
import { q } from './db.js'
import { mustLogin } from './auth.js'
import { kirimPush } from './push.js'

const r = Router()

// teks payload per tipe — sama untuk push & kartu in-app (handoff-implementasi.md §3)
const TEKS = {
  agenda_baru: (a) => ['Agenda baru', `${a.judul} · ${a.tanggal} ${String(a.jam).slice(0, 5)}`],
  alihan: (a, e) => ['Pengalihan agenda', `${e.dari} mengalihkan ${a.judul} ke Anda — jawab sebelum ${a.tanggal}`],
  h1: (a) => [`Besok: ${a.judul}`, `${String(a.jam).slice(0, 5)} · ${a.lokasi || '—'} — konfirmasi kehadiran Anda`],
  h: (a) => [`Hari ini: ${a.judul}`, `${String(a.jam).slice(0, 5)} · ${a.lokasi || '—'}`],
  paksa: (a) => ['Titik paksa', `Sekper menetapkan Anda pemegang ${a.judul} — segera konfirmasi`],
  ditolak: (a, e) => ['Pengalihan ditolak', `${e.nama} menolak ${a.judul} · kembali ke Anda`],
}

export async function kirimNotif(uid, agendaId, tipe, extra = {}) {
  await q('INSERT INTO notifikasi (user_id,agenda_id,tipe) VALUES (?,?,?)', [uid, agendaId, tipe])
  const [[a]] = await q('SELECT * FROM agenda WHERE id=?', [agendaId])
  const [title, body] = TEKS[tipe](a, extra)
  await kirimPush(uid, title, body, '/#/agenda/' + agendaId)
}

r.get('/', mustLogin, async (req, res) => {
  const uid = req.session.user.id
  const [rows] = await q(`SELECT n.id,n.tipe,n.dibaca,n.waktu,n.agenda_id,a.judul
    FROM notifikasi n JOIN agenda a ON a.id=n.agenda_id
    WHERE n.user_id=? ORDER BY n.waktu DESC, n.id DESC LIMIT 100`, [uid])
  const [[{ unread }]] = await q('SELECT COUNT(*) AS unread FROM notifikasi WHERE user_id=? AND dibaca=FALSE', [uid])
  res.json({ items: rows, unread })
})
r.post('/baca-semua', mustLogin, async (req, res) => {
  await q('UPDATE notifikasi SET dibaca=TRUE WHERE user_id=?', [req.session.user.id])
  res.json({ ok: true })
})
r.post('/:id/baca', mustLogin, async (req, res) => {
  await q('UPDATE notifikasi SET dibaca=TRUE WHERE id=? AND user_id=?', [req.params.id, req.session.user.id])
  res.json({ ok: true })
})
export default r
