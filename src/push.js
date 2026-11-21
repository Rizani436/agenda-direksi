import fs from 'fs'
import path from 'path'
import webpush from 'web-push'
import { q } from './db.js'

const VP = path.join(process.cwd(), 'vapid.json')
if (!fs.existsSync(VP)) {
  fs.writeFileSync(VP, JSON.stringify(webpush.generateVAPIDKeys()))
}
const { publicKey, privateKey } = JSON.parse(fs.readFileSync(VP, 'utf8'))
webpush.setVapidDetails('mailto:admin@example.com', publicKey, privateKey)

export const pubKey = () => publicKey

// best-effort: gagal diam-diam, subscription mati -> push_gagal merah
export async function kirimPush(userId, title, body, url = '/') {
  const [rows] = await q('SELECT push_token FROM users WHERE id=? AND push_token IS NOT NULL', [userId])
  for (const r of rows) {
    try {
      await webpush.sendNotification(JSON.parse(r.push_token), JSON.stringify({ title, body, url }))
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await q('UPDATE users SET push_token=NULL, push_gagal=TRUE WHERE id=?', [userId])
      }
    }
  }
}
