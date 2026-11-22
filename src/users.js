import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { q } from './db.js'
import { mustLogin, sekperOnly } from './auth.js'

const r = Router()

// utk dropdown alihkan: hanya user aktif (cuti/nonaktif tidak muncul)
r.get('/pengganti', mustLogin, async (req, res) => {
  const [rows] = await q(`SELECT id, nama, role FROM users
    WHERE status='aktif' AND id<>? ORDER BY nama`, [req.session.user.id])
  res.json(rows)
})
r.use(mustLogin, sekperOnly)
r.get('/', async (req, res) => {
  const [rows] = await q(`SELECT u.id,u.nama,u.username,u.role,u.status,u.push_gagal,u.must_change,
    (SELECT COUNT(*) FROM peserta_agenda p WHERE p.user_id=u.id) AS total_tugas
    FROM users u ORDER BY FIELD(u.role,'sekper','direksi','kadiv','kabak'), u.nama`)
  res.json(rows)
})
r.post('/', async (req, res) => {
  const { nama, username, role, status = 'aktif' } = req.body || {}
  if (!nama || !username || !role) return res.status(400).json({ error: 'nama, username, role wajib' })
  if (!['sekper', 'direksi', 'kadiv', 'kabak'].includes(role)) return res.status(400).json({ error: 'role tidak valid' })
  try {
    const [x] = await q('INSERT INTO users (nama,username,password_hash,role,status,must_change) VALUES (?,?,?,?,?,TRUE)',
      [nama, username, await bcrypt.hash(username, 10), role, status])
    res.json({ id: x.insertId })
  } catch (e) {
    res.status(409).json({ error: 'username sudah dipakai' })
  }
})
r.put('/:id', async (req, res) => {
  const { nama, role, status, password } = req.body || {}
  if (role && !['sekper', 'direksi', 'kadiv', 'kabak'].includes(role)) return res.status(400).json({ error: 'role tidak valid' })
  if (password && password.length < 6) return res.status(400).json({ error: 'password minimal 6 karakter' })
  await q('UPDATE users SET nama=COALESCE(?,nama), role=COALESCE(?,role), status=COALESCE(?,status) WHERE id=?',
    [nama, role, status, req.params.id])
  if (password) { // reset: password baru wajib diganti lagi saat login pertama
    await q('UPDATE users SET password_hash=?, must_change=TRUE WHERE id=?',
      [await bcrypt.hash(password, 10), req.params.id])
  }
  res.json({ ok: true })
})
r.delete('/:id', async (req, res) => {
  try {
    await q('DELETE FROM users WHERE id=?', [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    res.status(409).json({ error: 'user punya riwayat agenda — set nonaktif saja' })
  }
})
export default r
