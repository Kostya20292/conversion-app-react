#!/usr/bin/env bash
# Собирает Docker-образ LibreOffice, если доступен Docker. Не блокирует dev, если Docker выключен.
set -uo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${LIBREOFFICE_DOCKER_IMAGE:-convertly-libreoffice:local}"
COMPOSE_FILE="${ROOT}/docker-compose.yml"

if ! command -v docker >/dev/null 2>&1; then
  printf 'Docker не найден: DOCX↔PDF недоступны (нужен Docker Desktop).\n' >&2
  exec "$@"
fi

if ! docker info >/dev/null 2>&1; then
  printf 'Docker не запущен: DOCX↔PDF недоступны. Запустите Docker Desktop.\n' >&2
  exec "$@"
fi

printf 'Собираю образ LibreOffice (%s)…\n' "$IMAGE"
if docker compose -f "$COMPOSE_FILE" build libreoffice; then
  printf 'Образ LibreOffice готов.\n'
else
  printf 'Не удалось собрать образ LibreOffice: DOCX↔PDF могут не работать.\n' >&2
fi

exec "$@"
