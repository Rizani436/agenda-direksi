# Agenda Direksi

Sistem agenda + disposisi berantai untuk direksi: sekper membuat agenda → peserta jawab **Hadir / Alihkan / Tolak** → rantai berhenti saat ada yang hadir atau sekper paksa/batal. Web PWA + push notification.

## Stack

- **Backend**: Node.js + Express + MariaDB (XAMPP), session cookie
- **Frontend**: SPA vanilla JS tanpa build step (`public/`)
- **Push**: web-push (VAPID), service worker
- **Cron**: node-cron — notif H-1 & H jam 07:00 WIB, nag 17:00 WIB

## Menjalankan

```bash
npm install
# MariaDB harus jalan (XAMPP). Koneksi default: 127.0.0.1 root tanpa password.
npm run db:init     # buat + seed DB agenda_direksi (password awal = username)
npm start           # http://localhost:3000
```

Akun seed: `rahman` (sekper), `andi`, `dewi` (direksi), `sari` (kadiv), `budi` (kabak), `rian` (kabak, cuti). Login pertama wajib ganti password.

## Test

```bash
npm test            # butuh server jalan + DB fresh (npm run db:init)
```

15 assertion: login, draft→kirim, alih, urutan rantai (traversal head→alih_ke_id), anti-loop 409, pengganti exclude cuti/diri, tolak, rantai mentok, notif ditolak, paksa titik, batal.

## Struktur

```
db/schema.sql          skema (users, agenda, peserta_agenda, notifikasi)
scripts/init-db.js     drop + create + seed
scripts/test.js        test rantai end-to-end
src/db.js              pool mysql2
src/push.js            VAPID auto-gen (vapid.json, gitignored) + kirimPush best-effort
src/notif.js           teks notifikasi 6 tipe + insert notifikasi
src/auth.js            login/logout/me/change-password
src/users.js           CRUD user + GET /users/pengganti
src/agenda.js          CRUD agenda + alih/tolak/paksa/hadir/batal/kirim
src/cron.js            H-1, H 07:00, nag 17:00
server.js              express + static + SPA fallback
public/                SPA: index.html, app.js, styles.css, sw.js, manifest
```

## Aturan rantai

- **Alih**: wajib pilih pengganti aktif (dropdown exclude user cuti/nonaktif + diri), alasan wajib. Anti-loop: `UNIQUE(agenda_id, user_id)` di DB + cek aplikasi (409).
- **Tolak**: tanpa pengganti, rantai berhenti, notif `ditolak` ke sekper → sekper paksa-titik user lain atau batal agenda.
- **Hadir**: rantai selesai, status agenda → `selesai`.
- **Paksa**: hanya saat rantai mentok (tidak ada pemegang menunggu).
- **Draft**: default saat buat; tanpa peserta & notifikasi sampai dikirim.

## Dokumen desain

Spesifikasi + mockup final ada di `docs/` (`spec.md`, `handoff-implementasi.md`).
