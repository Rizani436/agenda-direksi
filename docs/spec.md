# Spec Sistem Agenda Direksi

Sistem penjadwalan + pengalihan tugas kehadiran rapat direksi.

## 1. Ringkasan

Sekper membuat agenda. Agenda dikirim ke direksi. Direksi jawab: hadir atau tidak. Kalau tidak, agenda dialihkan ke user lain (kadiv/kabak). Pengalihan berlanjut berantai sampai ada yang menjawab "hadir".

## 2. Role & Hak Akses

Satu user = satu role (fixed, tidak boleh multi-role).

| Role | Hak akses |
|---|---|
| sekper | Buat/ubah/hapus agenda, kelola user, paksa titik agenda, batalkan agenda. Melihat semua agenda + status rantai. |
| direksi | Melihat agenda yang ditujukan ke dia. Menjawab hadir / alihkan (pilih pengganti dari daftar user). Melihat trace rantai. |
| kadiv | Sama seperti direksi tapi hanya untuk agenda yang dialihkan ke dia. |
| kabak | Sama seperti kadiv. |

Direksi tidak bisa membuat/mengubah agenda. Semua penulisan agenda lewat sekper.

## 3. Alur

```
Sekper buat agenda
  → notif ke direksi
Direksi:
  ├─ Hadir       → selesai
  └─ Tidak hadir → pilih pengganti (kadiv/kabak) → notif ke pengganti
Pengganti:
  ├─ Hadir       → selesai
  ├─ Tidak hadir → alih ke user lain → notif ke berikutnya → ...
  │                (berhenti saat ada yang jawab "hadir")
  └─ Tolak       → tidak mau jadi pemegang, tanpa pengganti
                   → rantai berhenti, notif "ditolak" ke sekper
                   → sekper: paksa titik ke user lain, atau batalkan agenda
```

- Pengganti bebas, kecuali: sudah ada di rantai agenda itu (dijaga DB), dan user berstatus cuti/nonaktif (tidak muncul di dropdown).
- Tiap pengalihan wajib disertai alasan.
- Rantai berhenti hanya di: ada yang "hadir", atau sekper menutup paksa.

## 4. Data Model

Lihat `schema.sql` (versi final): `users`, `agenda`, `peserta_agenda`, `notifikasi`.

Rantai = linked list pada `peserta_agenda` via `alih_ke_id`. Riwayat pengalihan ditelusuri mundur dari node terakhir. Pemegang aktif = row terakhir per agenda dengan `status = 'menunggu'`.

Pagar anti-loop dijaga di level DB: `UNIQUE(agenda_id, user_id)` — satu user maksimal satu kali per agenda.

`users.status` = `aktif/cuti/nonaktif` — cuti & nonaktif tidak bisa jadi pengganti. `agenda.status` = `draft/aktif/selesai/batal` — draft belum dikirim ke peserta (tanpa baris `peserta_agenda`, tanpa notif) sampai sekper menekan Kirim; draft boleh punya data mentah (lokasi "TBD" dst).

## 5. Notifikasi — Strategi Berlapis

Channel: web push (VAPID, gratis) + notif in-app. Tidak pakai WhatsApp.

Notif web = best-effort, bukan jaminan (iPhone tanpa install PWA = nol push; HP Xiaomi/Oppo sering telat). Maka desain WAJIB tahan gagal:

| Lapis | Mekanisme | Menutup |
|---|---|---|
| 1 | Web push banner (klik → langsung detail agenda) | Device normal |
| 2 | Nag ulang: belum jawab sampai sore H-1 → push dikirim ulang | Yang lupa |
| 3 | Badge + counter in-app saat user buka web | Push gagal |
| 4 | Dashboard sekper: status "belum baca / belum jawab" merah | Keamanan terakhir — sekper telepon manual |

Trik reliabilitas:
1. Izin push diminta setelah login + lihat agenda pertama (bukan di landing page).
2. Re-subscribe push tiap login; subscription mati → tandai `push_gagal` merah.
3. Notif instan (agenda baru/alihan) risiko rendah; notif jadwal (H-1/H) dari cron adalah yang paling rawan — itulah yang di-nag.

Escalation masa depan: kalau daftar merah dashboard terus penuh → tambah WA Cloud API (notif saja, aksi tetap web) — backend tidak berubah.

## 6. Pagar Rantai (wajib)

1. **Anti-loop**: pengalihan tidak boleh ke user yang sudah ada di rantai agenda itu — dijaga `UNIQUE(agenda_id, user_id)` di DB.
2. **Alasan wajib**: tiap pengalihan harus isi alasan.
3. **Tombol darurat sekper**: rantai mentok (semua sudah dialih / tidak menjawab sampai hari-H) → sekper paksa titik ke user mana pun, atau batalkan agenda.

## 7. Tampilan

| Halaman | Isi |
|---|---|
| Dashboard sekper (desktop + mobile) | Ringkasan + statistik ringkas + agenda terbaru, badge merah "belum jawab" |
| Agenda sekper (desktop) | Filter Semua/Minggu/Bulan + search + tabel; klik baris → Detail |
| Detail agenda sekper | Info lengkap + riwayat disposisi (timeline) + tombol Edit / Batalkan |
| Buat agenda sekper | Form; Simpan (draft) atau Simpan & Kirim |
| Pengguna (sekper) | Tabel user + search + chip status aktif/cuti + CRUD |
| Beranda responder | Agenda terdekat + quick status |
| Agenda saya responder | Daftar agenda milik sendiri |
| Detail agenda responder | Info + trace rantai + tombol **Hadir** / **Tidak dapat hadir** |
| Form alihkan | Dropdown pengganti (di rantai + cuti disabled) + alasan wajib |
| Notifikasi responder | Inbox + badge; termasuk kartu "Pengalihan ditolak · kembali ke Anda" |

Mockup visual final: `design/agenda-sekper.png` (sekper) + `design/semua-layar-v5.png` (responder); UI kit untuk implementasi: `design/styleguide.png` + `design/agenda-styleguide.figcraft`. Sumber interaktif `*.figcraft` di folder yang sama. Panduan implementasi: `design/handoff-implementasi.md`.

## 8. Keputusan yang Masih Terbuka

1. Akun: sekper yang bikin; password awal = username; wajib ganti saat login pertama. (boleh direview saat implementasi)
2. Cron: H-1 dan H jam 07:00 WIB; nag ulang 17:00 WIB. (disetujui)
3. Stack backend: mengikuti kemampuan yang build — schema sudah MySQL, API-first (Laravel/Express/Django sama saja). Satu-satunya keputusan yang benar-benar belum ditetapkan.

## 9. Fase 2 (opsional): App Android Responder

Trigger: kalau push web terbukti gagal untuk user kunci, atau user minta notif "menempel".

Fitur yang hanya bisa native/Flutter:
- **Ongoing notification**: kartu notif tidak bisa di-swipe sampai user menjawab (Hadir / Tidak dapat hadir).
- **Tombol aksi di notif**: "Hadir" menembak API langsung dari panel notif, tanpa buka app.
- Push FCM paling andal.

Pembagian: web PWA untuk sekper (admin), app Android untuk direksi/kadiv/kabak (responder). Backend API satu, dipakai dua-duanya. Fase 1 tidak perlu menunggu fase 2 — API-first dari awal.
