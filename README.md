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
Документы без Docker не сконвертируются (картинки — да). PostgreSQL в Docker Compose **не** входит —
только LibreOffice.

## Переменные окружения

Копируйте `.env.example` в `.env`. Секреты только из env, файл `.env` в git не коммитится.

| Переменная                 | Зачем                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `NODE_ENV`                 | `development` / `test` / `production`. В production TypeORM не делает `synchronize` |
| `PORT`                     | Порт API, по умолчанию `3000`                                                       |
| `DATABASE_URL`             | Локальный PostgreSQL, например `postgresql://localhost:5432/convertly`              |
| `JWT_SECRET`               | Подпись cookie-сессии. В `.env` нужна длинная случайная строка                      |
| `CORS_ORIGIN`              | Origin SPA, для Vite: `http://127.0.0.1:5173`                                       |
| `STORAGE_ROOT`             | Корень файлов (`storage/`), не раздаётся статикой                                   |
| `LIBREOFFICE_DOCKER_IMAGE` | Образ `soffice`, по умолчанию `convertly-libreoffice:local`                         |

Vitest (`NODE_ENV=test`) ходит в базу `convertly_test` на том же сервере; она создаётся сама.

Создать базу для dev:

```bash
createdb convertly
```

## LibreOffice (DOCX↔PDF)

Worker вызывает `soffice` через `docker run --rm`. Картинки (JPG↔PNG) идут через Sharp и Docker не
нужен.

```bash
pnpm libreoffice:build
```

Если Docker выключен, `pnpm dev` всё равно стартует: JPG↔PNG работают, документы падают с
`conversion_failed`. В CI образ собирается из `docker-compose.yml` (сервис `libreoffice`).

## Тесты

Нужны тот же PostgreSQL и, для документов, собранный образ LibreOffice.

```bash
pnpm test          # unit: web (Vitest) + api (Vitest HTTP)
pnpm test:e2e      # Playwright: SPA + Nest на :5173 / :3000
pnpm lint
pnpm format:check
```

E2E поднимает API и Vite сами (`apps/web/playwright.config.ts`). Локально можно
`reuseExistingServer`, если `pnpm dev` уже запущен.
