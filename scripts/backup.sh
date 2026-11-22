#!/bin/sh
# backup harian agenda_direksi -> /backups (simpan 7 terakhir)
# berjalan sebagai container sidecar; mulai: backup langsung saat boot, lalu tiap 24 jam
mkdir -p /backups
while true; do
  f="/backups/agenda_$(date +%Y%m%d).sql.gz"
  if mariadb-dump -hdb -uroot -p"$DB_PASS" --single-transaction agenda_direksi | gzip > "$f.tmp"; then
    mv "$f.tmp" "$f"
    echo "[backup] OK $f ($(du -h "$f" | cut -f1))"
  else
    echo "[backup] GAGAL"
    rm -f "$f.tmp"
  fi
  ls -1t /backups/agenda_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
  sleep 86400
done
