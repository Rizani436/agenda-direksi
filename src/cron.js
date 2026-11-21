import cron from 'node-cron'
import { q } from './db.js'
import { kirimNotif } from './notif.js'

// H-1 + hari-H, jam 07:00 WIB (spec §5, disetujui)
export async function kirimHarian() {
  const [[h1rows], [hrows]] = [await q(`SELECT a.id, p.user_id FROM agenda a
      JOIN peserta_agenda p ON p.agenda_id=a.id AND p.status='menunggu'
      WHERE a.status='aktif' AND a.tanggal=CURDATE()+INTERVAL 1 DAY`),
    await q(`SELECT a.id, p.user_id FROM agenda a
      JOIN peserta_agenda p ON p.agenda_id=a.id AND p.status='menunggu'
      WHERE a.status='aktif' AND a.tanggal=CURDATE()`)]
  for (const x of h1rows) await kirimNotif(x.user_id, x.id, 'h1')
  for (const x of hrows) await kirimNotif(x.user_id, x.id, 'h')
  return { h1: h1rows.length, h: hrows.length }
}

// nag ulang sore H-1 (17:00 WIB): pemegang aktif belum menjawab agenda besok
export async function nagSore() {
  const [rows] = await q(`SELECT a.id, p.user_id FROM agenda a
    JOIN peserta_agenda p ON p.agenda_id=a.id AND p.status='menunggu' AND p.waktu_respon IS NULL
    WHERE a.status='aktif' AND a.tanggal=CURDATE()+INTERVAL 1 DAY`)
  for (const x of rows) await kirimNotif(x.user_id, x.id, 'h1')
  return { nag: rows.length }
}

export function startCron() {
  cron.schedule('0 7 * * *', () => kirimHarian().catch(console.error), { timezone: 'Asia/Jakarta' })
  cron.schedule('0 17 * * *', () => nagSore().catch(console.error), { timezone: 'Asia/Jakarta' })
}
