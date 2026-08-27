#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH}"

resolve_pg_formula() {
  if [[ -n "${POSTGRES_BREW_FORMULA:-}" ]]; then
    printf '%s\n' "$POSTGRES_BREW_FORMULA"
    return 0
  fi

  local formula
  for formula in postgresql@16 postgresql@17 postgresql@15 postgresql; do
    if brew list --formula --versions "$formula" >/dev/null 2>&1; then
      printf '%s\n' "$formula"
      return 0
    fi
  done

  return 1
}

if ! command -v brew >/dev/null 2>&1; then
  printf 'Нужен Homebrew, чтобы запустить PostgreSQL.\n' >&2
  exit 1
fi

PG_FORMULA="$(resolve_pg_formula)" || {
  printf 'PostgreSQL не установлен. Установите: brew install postgresql@16\n' >&2
  exit 1
}

PG_ISREADY="$(brew --prefix "$PG_FORMULA")/bin/pg_isready"
if [[ ! -x "$PG_ISREADY" ]]; then
  printf 'Не найден pg_isready для %s.\n' "$PG_FORMULA" >&2
  exit 1
fi

postgres_ready() {
  "$PG_ISREADY" -h localhost -q
}

start_postgres() {
  if postgres_ready; then
    printf 'PostgreSQL уже запущен.\n'
    return 0
  fi

  printf 'Запускаю PostgreSQL (%s)…\n' "$PG_FORMULA"
  brew services run "$PG_FORMULA"

  local attempt
  for attempt in $(seq 1 60); do
    if postgres_ready; then
      printf 'PostgreSQL готов.\n'
      return 0
    fi
    sleep 0.5
  done

  printf 'PostgreSQL не ответил после запуска.\n' >&2
  return 1
}

_pg_cleaned=0
cleanup() {
  if [[ "$_pg_cleaned" -eq 1 ]]; then
    return
  fi
  _pg_cleaned=1
  printf '\nОстанавливаю PostgreSQL…\n'
  brew services stop "$PG_FORMULA" || true
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

start_postgres
"$@"
