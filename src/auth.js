import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { q } from './db.js'

const r = Router()

export const mustLogin = (req, res, next) =>
  req.session.user ? next() : res.status(401).json({ error: 'login dulu' })
export const sekperOnly = (req, res, next) =>
  req.session.user?.role === 'sekper' ? next() : res.status(403).json({ error: 'khusus sekretaris' })

r.post('/login', async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: 'username & password wajib' })
  const [[u]] = await q('SELECT * FROM users WHERE username=?', [username])
  if (!u || !(await bcrypt.compare(password, u.password_hash)))
    return res.status(401).json({ error: 'username atau password salah' })
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
