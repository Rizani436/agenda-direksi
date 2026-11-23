-- =============================================================
-- Agenda Direksi — Schema DB
-- Rantai pengalihan: linked list di peserta_agenda via alih_ke_id
-- Pemegang aktif = row terakhir per agenda dengan status 'menunggu'
-- =============================================================

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nama          VARCHAR(100) NOT NULL,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('sekper','direksi','kadiv','kabak') NOT NULL,
  push_token    TEXT NULL,                -- web push subscription (JSON)
  push_gagal    BOOLEAN DEFAULT FALSE,    -- tandai merah jika push mati
  status        ENUM('aktif','cuti','nonaktif') NOT NULL DEFAULT 'aktif',
  must_change   BOOLEAN DEFAULT TRUE,     -- wajib ganti password login pertama
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE agenda (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  judul       VARCHAR(200) NOT NULL,
  tanggal     DATE NOT NULL,
  jam         TIME NOT NULL,
  lokasi      VARCHAR(150),
  catatan     TEXT,
  dibuat_oleh INT NOT NULL,               -- users.id (harus role sekper)
  status      ENUM('draft','aktif','selesai','batal') DEFAULT 'draft', -- draft = belum dikirim, tanpa peserta, tanpa notif
  pengingat_15 TINYINT(1) NOT NULL DEFAULT 0,  -- sudah dikirim pengingat 15 menit sebelum mulai?
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dibuat_oleh) REFERENCES users(id),
  INDEX idx_tanggal (tanggal, status)
) ENGINE=InnoDB;

CREATE TABLE peserta_agenda (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  agenda_id    INT NOT NULL,
  user_id      INT NOT NULL,
  status       ENUM('menunggu','hadir','tidak_hadir','dialihkan','ditolak') DEFAULT 'menunggu',
  alasan       VARCHAR(255),             -- wajib saat alihkan (pagar #2)
  alih_ke_id   INT NULL,                 -- -> peserta_agenda.id (node berikutnya)
  waktu_respon DATETIME NULL,            -- NULL = belum menjawab
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agenda_id) REFERENCES agenda(id),
  FOREIGN KEY (user_id)   REFERENCES users(id),
  FOREIGN KEY (alih_ke_id) REFERENCES peserta_agenda(id),
  -- Pagar #1 anti-loop: 1 user maksimal 1 kali per agenda, dijaga DB
  UNIQUE KEY uq_anti_loop (agenda_id, user_id),
  INDEX idx_agenda (agenda_id, id),
  INDEX idx_user (user_id, status)
) ENGINE=InnoDB;

CREATE TABLE sessions (
  sid      VARCHAR(64) PRIMARY KEY,
  sess     LONGTEXT NOT NULL,
  expires  BIGINT NOT NULL,
  INDEX idx_expires (expires)
) ENGINE=InnoDB;

CREATE TABLE device_tokens (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  user_id   INT NOT NULL,
  token     VARCHAR(255) NOT NULL,      -- FCM token (APK Capacitor)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uq_token (token)
) ENGINE=InnoDB;

CREATE TABLE notifikasi (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  user_id   INT NOT NULL,
  agenda_id INT NOT NULL,
  tipe      ENUM('agenda_baru','alihan','h1','h','paksa','ditolak','pengingat','pengingat15','batal') NOT NULL,
  dibaca    BOOLEAN DEFAULT FALSE,
  waktu     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users(id),
  FOREIGN KEY (agenda_id) REFERENCES agenda(id),
  INDEX idx_inbox (user_id, dibaca, waktu)
) ENGINE=InnoDB;

-- =============================================================
-- Alur status peserta:
--   menunggu    -> jawab 'Hadir'        -> hadir        (rantai berhenti)
--   menunggu    -> jawab 'Tidak hadir'  -> tidak_hadir,
--                  buat node baru utk pengganti, alih_ke_id -> node baru,
--                  status jadi 'dialihkan'... (catatan: status kolom tetap
--                  'tidak_hadir' + alih_ke_id terisi; 'dialihkan' = view)
--   menunggu    -> 'Tolak' (tanpa pengganti) -> ditolak,
--                  rantai berhenti, notif tipe 'ditolak' ke sekper
--   node pengganti mulai di status 'menunggu'
-- =============================================================
