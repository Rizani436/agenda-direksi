import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { q } from './db.js'

const r = Router()

export const mustLogin = (req, res, next) =>
  req.session.user ? next() : res.status(401).json({ error: 'login dulu' })
export const sekperOnly = (req, res, next) =>
  req.session.user?.role === 'sekper' ? next() : res.status(403).json({ error: 'khusus sekretaris' })

const gagal = new Map() // ponytail: rate limit login in-memory (reset saat restart); pindah DB saat multi-instance
const MAX_GAGAL = 5, LOCK_MS = 15 * 60 * 1000

r.post('/login', async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: 'username & password wajib' })
  const key = String(username).toLowerCase()
  const g = gagal.get(key)
  if (g && g.count >= MAX_GAGAL && Date.now() < g.until)
    return res.status(429).json({ error: 'terlalu banyak percobaan — coba lagi dalam 15 menit' })
  const [[u]] = await q('SELECT * FROM users WHERE username=?', [username])
  if (!u || !(await bcrypt.compare(password, u.password_hash))) {
    const rec = gagal.get(key) || { count: 0 }
    rec.count++
    rec.until = Date.now() + LOCK_MS
    gagal.set(key, rec)
    if (gagal.size > 1000) gagal.clear() // batasi memori dari spam username
    return res.status(401).json({ error: 'username atau password salah' })
  }
  gagal.delete(key)
  if (u.status === 'nonaktif') return res.status(403).json({ error: 'akun nonaktif' })
  req.session.user = { id: u.id, nama: u.nama, username: u.username, role: u.role, must_change: !!u.must_change }
  res.json(req.session.user)
})
r.post('/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })))
r.get('/me', mustLogin, (req, res) => res.json(req.session.user))
r.post('/change-password', mustLogin, async (req, res) => {
  const { password } = req.body || {}
  if (!password || password.length < 6) return res.status(400).json({ error: 'password minimal 6 karakter' })
  await q('UPDATE users SET password_hash=?, must_change=FALSE WHERE id=?',
    [await bcrypt.hash(password, 10), req.session.user.id])
  req.session.user.must_change = false
  res.json({ ok: true })
})
export default r
