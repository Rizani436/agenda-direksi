import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

const conn = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: '', multipleStatements: true })
await conn.query('DROP DATABASE IF EXISTS agenda_direksi')
await conn.query('CREATE DATABASE agenda_direksi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
await conn.changeUser({ database: 'agenda_direksi' })
await conn.query(fs.readFileSync(path.join(process.cwd(), 'db/schema.sql'), 'utf8'))

const users = [
  ['Bpk. Rahman', 'rahman', 'sekper', 'aktif'],
  ['Andi Pratama', 'andi', 'direksi', 'aktif'],
  ['Sari Wulandari', 'sari', 'kadiv', 'aktif'],
  ['Budi Santoso', 'budi', 'kabak', 'aktif'],
  ['Rian Hidayat', 'rian', 'kabak', 'cuti'],
  ['Dewi Lestari', 'dewi', 'direksi', 'aktif'],
]
for (const [nama, username, role, status] of users) {
  await conn.query('INSERT INTO users (nama,username,password_hash,role,status) VALUES (?,?,?,?,?)',
    [nama, username, await bcrypt.hash(username, 10), role, status])
}
// ids: 1 rahman, 2 andi, 3 sari, 4 budi, 5 rian, 6 dewi
await conn.query(`INSERT INTO agenda (judul,tanggal,jam,lokasi,catatan,dibuat_oleh,status) VALUES
 ('Rapat Evaluasi Kinerja Q2','2026-06-12','09:00:00','Ruang Rapat 2, Lantai 2','Evaluasi capaian target Q2 dan rencana tindak lanjut divisi. Bawa laporan triwulan dari masing-masing kepala divisi.',1,'aktif'),
 ('Rapat Koordinasi TPS3R Wilayah Timur','2026-07-08','10:00:00','TBD','Koordinasi pengelolaan TPS3R wilayah timur.',1,'draft'),
 ('Kunjungan Mitra BUMN','2026-06-24','13:00:00','Kantor Mitra','Silaturahmi dan pembahasan kerja sama.',1,'aktif'),
 ('Rapat Anggaran Q3','2026-06-16','09:00:00','TBD','Pembahasan anggaran triwulan III.',1,'aktif')`)
// rantai contoh: sari node awal (id 1), andi dialihkan ke sari (id 2 -> alih_ke 1)
await conn.query(`INSERT INTO peserta_agenda (agenda_id,user_id,status) VALUES (1,3,'menunggu')`)
await conn.query(`INSERT INTO peserta_agenda (agenda_id,user_id,status,alasan,alih_ke_id,waktu_respon) VALUES
 (1,2,'tidak_hadir','Bentrok rapat dinas di luar kota',1,'2026-06-13 14:05:00')`)
await conn.query(`INSERT INTO peserta_agenda (agenda_id,user_id) VALUES (3,6),(4,2)`)
await conn.query(`INSERT INTO notifikasi (user_id,agenda_id,tipe,dibaca) VALUES
 (3,1,'alihan',FALSE),(2,4,'agenda_baru',TRUE),(6,3,'agenda_baru',FALSE)`)
console.log('DB siap: agenda_direksi (MariaDB) — password awal = username, wajib ganti saat login pertama')
await conn.end()
