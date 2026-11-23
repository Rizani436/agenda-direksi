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

// flip aktif<->selesai otomatis sesuai jadwal (status ikut waktu, bukan konfirmasi)
export async function selesaikanLewat() {
  await q(`UPDATE agenda SET status='aktif'
    WHERE status='selesai' AND CONCAT(tanggal,' ',jam) > NOW()`)
  const [x] = await q(`UPDATE agenda SET status='selesai'
    WHERE status='aktif' AND CONCAT(tanggal,' ',jam) <= NOW()`)
  return x.affectedRows || 0
}

// pengingat 15 menit sebelum agenda mulai — sekali per agenda (kolom pengingat_15)
export async function pengingat15() {
  const [rows] = await q(`SELECT id, judul, jam, lokasi FROM agenda
    WHERE status='aktif' AND pengingat_15=FALSE
    AND CONCAT(tanggal,' ',jam) > NOW()
    AND CONCAT(tanggal,' ',jam) <= NOW() + INTERVAL 15 MINUTE`)
  let n = 0
  for (const a of rows) {
    const [ps] = await q('SELECT DISTINCT user_id FROM peserta_agenda WHERE agenda_id=?', [a.id])
    for (const p of ps) await kirimNotif(p.user_id, a.id, 'pengingat15')
    await q('UPDATE agenda SET pengingat_15=TRUE WHERE id=?', [a.id])
    n++
  }
  return n
}

// migrasi idempotent untuk DB lama (jalankan tiap boot, aman diulang)
async function migrasi() {
  const alters = [
    `CREATE TABLE IF NOT EXISTS sessions (
      sid      VARCHAR(64) PRIMARY KEY,
      sess     LONGTEXT NOT NULL,
      expires  BIGINT NOT NULL,
      INDEX idx_expires (expires)
    ) ENGINE=InnoDB`,
    "ALTER TABLE notifikasi MODIFY tipe ENUM('agenda_baru','alihan','h1','h','paksa','ditolak','pengingat','pengingat15','batal') NOT NULL",
    'ALTER TABLE agenda ADD COLUMN pengingat_15 TINYINT(1) NOT NULL DEFAULT 0',
    'DELETE FROM sessions WHERE expires < ?',
  ]
  for (const s of alters) {
    try {
      await q(s, s.startsWith('DELETE') ? [Date.now()] : [])
    } catch (e) { if (!/Duplicate column/i.test(e.message)) console.warn('[migrasi]', e.message) }
  }
}

export async function startCron() {
  await migrasi()
  selesaikanLewat().catch(console.error) // jalankan sekali saat boot
  pengingat15().catch(console.error)
  cron.schedule('0 7 * * *', () => kirimHarian().catch(console.error), { timezone: 'Asia/Jakarta' })
  cron.schedule('0 17 * * *', () => nagSore().catch(console.error), { timezone: 'Asia/Jakarta' })
  cron.schedule('* * * * *', () => selesaikanLewat().catch(console.error), { timezone: 'Asia/Jakarta' })
  cron.schedule('* * * * *', () => pengingat15().catch(console.error), { timezone: 'Asia/Jakarta' })
}
