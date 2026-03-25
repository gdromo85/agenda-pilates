#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"

log() {
  printf '[deploy] %s\n' "$1"
}

log "Starting deploy in ${ROOT_DIR}"

log "Pulling latest changes"
git -C "${ROOT_DIR}" pull

log "Installing backend dependencies"
npm --prefix "${BACKEND_DIR}" install

log "Installing frontend dependencies"
npm --prefix "${FRONTEND_DIR}" install

log "Running prisma generate"
npm --prefix "${BACKEND_DIR}" run prisma:generate

log "Running prisma migrate deploy"
npm --prefix "${BACKEND_DIR}" run prisma:migrate

log "Restarting backend with pm2"
pm2 restart backend

log "Deploy finished"
