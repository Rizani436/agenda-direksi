# Handoff Implementasi — Agenda Direksi

Untuk yang build website. Desain = 3 file `.figcraft` (sumber interaktif, bisa di-klik di FigCraft) + 3 PNG render. Panduan token visual di `styleguide.png` (13 CSS var, tipografi, komponen, state). Spesifikasi produk: `../spec.md`, DB: `../schema.sql`.

## 1. File desain

| File | Isi |
|---|---|
| `agenda-sekper.figcraft` | 8 layar sekper (mobile Dashboard/Buat, desktop Dashboard/Buat/Agenda/Detail/Pengguna/Agenda-Kosong) |
| `agenda-direksi-v5.figcraft` | 11 layar responder (mobile): Beranda, Agenda Saya, Form Alihkan, Notifikasi, Detail, Riwayat, dsb |
| `agenda-styleguide.figcraft` | UI kit: warna, tipografi, spacing, komponen, state hover/press |

## 2. Urutan build (API-first)

1. Auth + CRUD user (password awal = username, wajib ganti login pertama)
2. CRUD agenda + draft (Simpan = draft, Simpan & Kirim = aktif + notif)
3. Rantai pengalihan: hadir / alihkan / tolak + trace
4. Notifikasi in-app + badge counter
5. Web push (VAPID) + cron 07:00 (H-1 & H) + nag 17:00
6. PWA: manifest, service worker, re-subscribe push tiap login

## 3. Teks payload push (per tipe `notifikasi.tipe`)

| Tipe | Title | Body |
|---|---|---|
| `agenda_baru` | Agenda baru | {judul} · {tgl, jam} |
| `alihan` | Pengalihan agenda | {pemberi} mengalihkan {judul} ke Anda — jawab sebelum {tgl} |
| `h1` | Besok: {judul} | {jam} · {lokasi} — konfirmasi kehadiran Anda |
| `h` | Hari ini: {judul} | {jam} · {lokasi} |
| `paksa` | Titik paksa | Sekper menetapkan Anda pemegang {judul} — segera konfirmasi |
| `ditolak` (→ sekper) | Pengalihan ditolak | {nama} menolak {judul} · kembali ke Anda |

Teks kartu in-app = sama dengan body. Klik notif → langsung detail agenda.

## 4. Aturan alur yang mudah salah

- Dropdown pengganti: exclude user yang sudah ada di rantai (DB guard `UNIQUE(agenda_id, user_id)`) + user status `cuti`/`nonaktif`.
- Alasan wajib saat alihkan — jangan kirim form tanpa validasi.
- "Tolak" ≠ "Tidak hadir": tolak = tidak mau jadi pemegang tanpa pengganti → status `ditolak`, rantai berhenti, notif ke sekper.
- Draft tidak punya baris `peserta_agenda` dan tidak memicu notif. Data mentah (lokasi "TBD") sah.
- Edit agenda saat rantai jalan: ubah tanggal/jam → kirim ulang notif H-1 ke pemegang aktif.
- Cron jam 07:00 WIB; nag ulang 17:00 hanya untuk pemegang aktif dengan `waktu_respon IS NULL`.

## 5. Layout & responsive

- Sekper desktop: sidebar 240px + konten 1440px. Breakpoint < 768px → layout mobile (kartu, tanpa tabel; layar mobile Dashboard & Buat ada di file sekper).
- Responder: mobile-first 390px, max-width 480 center.
- Margin halaman 24, gutter kartu 16, radius kartu 16 / tombol 14 / chip setengah tinggi.

## 6. Aksesibilitas

- Baris tabel & checkbox: full-row tappable, minimal tinggi 44px.
- Focus-visible: outline 2px `--pri`, offset 2.
- Kontras teks sudah AA via token — jangan ganti hex manual, pakai CSS var.
- Ikon: Material filled, satu keluarga.

## 7. Interaksi yang sudah di-desain (peta klik)

- Sekper: sidebar bolak-balik semua layar, klik baris/chevron → Detail, Edit/Batalkan di Detail, search.
- Responder: bottom nav 3 tab, kartu agenda → Detail, Hadir/Tidak dapat hadir → Form alihkan (pilih pengganti + alasan) / konfirmasi, Notifikasi → Detail, kartu "ditolak" → Form Alihkan ulang.
- Transisi antar layar 250ms easeOut (smartAnimate).

## 8. Empty states yang sudah didesain

- Agenda sekper dengan filter kosong (layar "Agenda Kosong").
- Notifikasi kosong & Agenda Saya kosong (responder).
