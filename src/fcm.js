import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { q } from './db.js'

// ponytail: JWT RS256 + FCM HTTP v1 pakai stdlib saja (firebase-admin dep-nya berat);
// ganti ke firebase-admin kalau mulai butuh topic/condition/batching.
const saPath = process.env.FCM_SA_PATH || path.join(process.cwd(), 'firebase-service-account.json')
let sa = null
let access = null // { token, exp }

function saLoad() {
  if (sa) return sa
  if (!fs.existsSync(saPath)) return null
  sa = JSON.parse(fs.readFileSync(saPath, 'utf8'))
  return sa
}

async function getToken() {
  if (access && access.exp > Math.floor(Date.now() / 1000) + 60) return access.token
  const s = saLoad()
  if (!s) return null
  const now = Math.floor(Date.now() / 1000)
  const head = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const claims = Buffer.from(JSON.stringify({
    iss: s.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: s.token_uri,
    iat: now,
    exp: now + 3600,
  })).toString('base64url')
  const sig = crypto.createSign('RSA-SHA256').update(head + '.' + claims).sign(s.private_key, 'base64url')
  const r = await fetch(s.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + head + '.' + claims + '.' + sig,
    signal: AbortSignal.timeout(15000), // jangan biarkan request menggantung tanpa batas
  })
  const d = await r.json()
  if (!d.access_token) throw new Error('fcm auth gagal: ' + JSON.stringify(d))
  access = { token: d.access_token, exp: now + (d.expires_in || 3600) }
  return access.token
}

// best-effort: gagal diam-diam; token mati (uninstall) dihapus dari DB
export async function kirimFcm(userId, title, body, agendaId) {
  try {
    const s = saLoad()
    if (!s) { console.warn('[fcm] firebase-service-account.json tidak ada — lewati FCM'); return }
    const [rows] = await q('SELECT id, token FROM device_tokens WHERE user_id=?', [userId])
    if (rows.length === 0) { console.log(`[fcm] user ${userId} tanpa device token — lewati FCM`); return }
    const token = await getToken()
    for (const row of rows) {
      const r = await fetch(`https://fcm.googleapis.com/v1/projects/${s.project_id}/messages:send`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: {
          token: row.token,
          notification: { title, body },
          data: { agendaId: String(agendaId ?? '') },
          android: { priority: 'HIGH', notification: { channel_id: 'agenda' } }, // heads-up pop-up di layar lock
        } }),
        signal: AbortSignal.timeout(15000), // egress ke Google bisa diblok firewall — jangan menggantung selamanya
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        const msg = d.error?.message || ''
        console.warn(`[fcm] kirim gagal HTTP ${r.status}: ${msg.slice(0, 200)}`)
        if (r.status === 404 || msg.includes('UNREGISTERED') || msg.includes('not a valid FCM'))
          await q('DELETE FROM device_tokens WHERE id=?', [row.id])
      } else {
        console.log(`[fcm] terkirim ke user ${userId}`)
      }
    }
  } catch (e) { console.warn('[fcm] error:', e.message) }
}
