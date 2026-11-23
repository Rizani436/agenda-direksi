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
app.use((req, res, next) => { if (req.originalUrl.startsWith('/api')) console.log(req.method, req.originalUrl); next() })
app.set('trust proxy', 1) // deploy di belakang proxy https (siagen.nexus-aniway.online)

// sesi disimpan di tabel DB agar login bertahan antar restart container — HP cukup login sekali
const SESSION_TTL = 365 * 24 * 3600 * 1000 // 1 tahun; rolling = tiap aktifitas memperpanjang otomatis
class DbStore extends session.Store {
  get(sid, cb) {
    q('SELECT sess, expires FROM sessions WHERE sid=?', [sid]).then(([rows]) => {
      if (!rows.length) return cb()
      if (rows[0].expires < Date.now()) {
        q('DELETE FROM sessions WHERE sid=?', [sid]).catch(() => {})
        return cb()
      }
      let s; try { s = JSON.parse(rows[0].sess) } catch (_) { return cb() }
      cb(null, s)
    }).catch((e) => cb(e))
  }
  set(sid, sess, cb) {
    const exp = sess.cookie?.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + SESSION_TTL
    q('REPLACE INTO sessions (sid, sess, expires) VALUES (?,?,?)', [sid, JSON.stringify(sess), exp])
      .then(() => cb()).catch((e) => cb(e))
  }
  destroy(sid, cb) { q('DELETE FROM sessions WHERE sid=?', [sid]).then(() => cb()).catch((e) => cb(e)) }
  touch(sid, sess, cb) {
    const exp = sess.cookie?.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + SESSION_TTL
    q('UPDATE sessions SET expires=? WHERE sid=?', [exp, sid]).then(() => cb()).catch((e) => cb(e))
  }
}
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'), // secret stabil via env agar sesi tidak mati saat restart
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { maxAge: SESSION_TTL, sameSite: 'lax', secure: 'auto' }, // secure aktif otomatis saat https, dev http aman
  store: new DbStore(),
}))

app.post('/api/push/subscribe', mustLogin, async (req, res) => {
  const { subscription } = req.body || {}
  if (!subscription) return res.status(400).json({ error: 'subscription wajib' })
  await q('UPDATE users SET push_token=?, push_gagal=FALSE WHERE id=?',
    [JSON.stringify(subscription), req.session.user.id])
  res.json({ ok: true })
})
app.get('/api/push/public-key', (req, res) => res.json({ key: pubKey() }))

app.post('/api/push/probe', (req, res) => { console.log('[probe]', JSON.stringify(req.body || {})); res.json({ ok: true }) })

app.post('/api/push/fcm-token', mustLogin, async (req, res) => {
  const { token } = req.body || {}
  if (!token) return res.status(400).json({ error: 'token wajib' })
  try {
    await q(`INSERT INTO device_tokens (user_id, token) VALUES (?,?)
      ON DUPLICATE KEY UPDATE user_id=VALUES(user_id)`, [req.session.user.id, token])
    console.log(`[fcm-token] user ${req.session.user.id} (${req.session.user.username}) → tersimpan ${String(token).slice(0, 16)}…`)
    res.json({ ok: true })
  } catch (e) {
    console.log('[fcm-token] gagal simpan:', e.message)
    res.status(500).json({ error: 'gagal simpan token' })
  }
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
