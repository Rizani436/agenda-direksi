// cek pengingat 15 menit: buat agenda uji 10 menit dari sekarang, jalankan pengingat15(), verifikasi, bersihkan
import { q } from '../src/db.js'
import { pengingat15 } from '../src/cron.js'

const [res] = await q(`INSERT INTO agenda (judul, tanggal, jam, lokasi, dibuat_oleh, status)
  VALUES ('TEST Pengingat15', CURDATE(), DATE_ADD(NOW(), INTERVAL 10 MINUTE), 'Rapat Uji', 1, 'aktif')`)
const id = res.insertId
await q(`INSERT INTO peserta_agenda (agenda_id, user_id, status) VALUES (?, 7, 'menunggu')`, [id])

const n = await pengingat15()
const [[c]] = await q(`SELECT COUNT(*) AS c FROM notifikasi WHERE agenda_id=? AND tipe='pengingat15'`, [id])
const [[flag]] = await q(`SELECT pengingat_15 AS f FROM agenda WHERE id=?`, [id])
console.log(`agenda ${id} | kirim: ${n} | notif: ${c.c} | flag: ${flag.f}`)

await q(`DELETE FROM notifikasi WHERE agenda_id=?`, [id])
await q(`DELETE FROM peserta_agenda WHERE agenda_id=?`, [id])
await q(`DELETE FROM agenda WHERE id=?`, [id])
process.exit(n === 1 && c.c === 1 && flag.f === 1 ? 0 : 1)
