import crypto from 'crypto'
import fs from 'fs'
import express from 'express'
import session from 'express-session'
import path from 'path'
import { fileURLToPath } from 'url'
import auth, { mustLogin } from './src/auth.js'
import { q } from './src/db.js'
import users from './src/users.js'
import agenda from './src/agenda.js'
import notif from './src/notif.js'
import { pubKey } from './src/push.js'
import { startCron } from './src/cron.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json())
app.set('trust proxy', 1) // deploy di belakang proxy https (siagen.nexus-aniway.online)
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'), // secret stabil via env agar sesi tidak mati saat restart
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 3600 * 1000, sameSite: 'lax', secure: 'auto' }, // secure aktif otomatis saat https, dev http aman
}))

app.post('/api/push/subscribe', mustLogin, async (req, res) => {
  const { subscription } = req.body || {}
  if (!subscription) return res.status(400).json({ error: 'subscription wajib' })
  await q('UPDATE users SET push_token=?, push_gagal=FALSE WHERE id=?',
    [JSON.stringify(subscription), req.session.user.id])
  res.json({ ok: true })
})
app.get('/api/push/public-key', (req, res) => res.json({ key: pubKey() }))

app.post('/api/push/fcm-token', mustLogin, async (req, res) => {
  const { token } = req.body || {}
  if (!token) return res.status(400).json({ error: 'token wajib' })
  await q(`INSERT INTO device_tokens (user_id, token) VALUES (?,?)
    ON DUPLICATE KEY UPDATE user_id=VALUES(user_id)`, [req.session.user.id, token])
  res.json({ ok: true })
})

// diagnosa FCM (sekper only): SA file + token terdaftar per user
app.get('/api/push/diag', mustLogin, async (req, res) => {
  if (req.session.user.role !== 'sekper') return res.status(403).json({ error: 'sekper only' })
  const sa = fs.existsSync(process.env.FCM_SA_PATH || path.join(process.cwd(), 'firebase-service-account.json'))
  const [rows] = await q('SELECT d.user_id, u.nama, COUNT(*) AS n FROM device_tokens d JOIN users u ON u.id=d.user_id GROUP BY d.user_id, u.nama')
  res.json({ sa, tokens: rows })
})

app.use('/api', auth)
app.use('/api/users', users)
app.use('/api/notifikasi', notif)
app.use('/api/agenda', agenda)

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, p) => {
    // html/js/css wajib revalidate (etag 304) — cache lama bikin update JS nggak sampai ke user
    if (/\.(html|js|css|json|svg)$/.test(p)) res.setHeader('Cache-Control', 'no-cache')
    else res.setHeader('Cache-Control', 'public, max-age=604800') // ikon/font boleh lama
  },
}))
app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')))

// error handler: pesan DB/validasi jangan bocor mentah
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'kesalahan server' })
})

startCron()
app.listen(3000, () => console.log('Agenda Direksi: http://localhost:3000'))
// jangan matikan server karena error async di route — log saja
process.on('unhandledRejection', (err) => console.error('[unhandled]', err))
