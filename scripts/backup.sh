#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${ROOT_DIR}/backups"
TIMESTAMP="$(date +"%Y%m%d-%H%M")"
BACKUP_FILE="${BACKUP_DIR}/backup-${TIMESTAMP}.sql"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[backup] ERROR: DATABASE_URL is not set"
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

echo "[backup] Starting backup to ${BACKUP_FILE}"
pg_dump "${DATABASE_URL}" > "${BACKUP_FILE}"
echo "[backup] Backup created"

mapfile -t backups < <(ls -1t "${BACKUP_DIR}"/backup-*.sql 2>/dev/null || true)

if (( ${#backups[@]} > 14 )); then
  for old_backup in "${backups[@]:14}"; do
    rm -f "${old_backup}"
    echo "[backup] Removed old backup: ${old_backup}"
  done
fi

echo "[backup] Done"
