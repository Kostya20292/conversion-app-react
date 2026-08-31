# Convertly

Monorepo конвертера файлов (JPG↔PNG, DOCX↔PDF).

## Структура

```
apps/web   — React + Vite (SPA)
apps/api   — NestJS
docker/    — образ LibreOffice (headless)
docs/      — ТЗ, архитектура, стек
```

## Запуск

Нужны: Node 22+, pnpm, локальный PostgreSQL, **Docker Desktop** (для DOCX↔PDF).

```bash
pnpm install
cp .env.example .env   # задать JWT_SECRET и DATABASE_URL
pnpm dev
```

`pnpm dev` поднимает локальный PostgreSQL и собирает образ LibreOffice, если Docker запущен.
Документы без Docker не сконвертируются (картинки — да). Собрать образ отдельно:

```bash
pnpm libreoffice:build
```

PostgreSQL в Docker Compose **не** входит — только LibreOffice.
