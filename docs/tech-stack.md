# Стек технологий: Convertly

Единый источник правды по технологиям. Продуктовые требования — в
[`technical-task.md`](./technical-task.md).

Статус: **зафиксирован**.

---

## 1. Обзор

| Слой               | Выбор                                                    |
| ------------------ | -------------------------------------------------------- |
| Frontend           | React + TypeScript + Vite                                |
| Стили              | SCSS Modules                                             |
| Backend            | NestJS + TypeScript                                      |
| БД                 | PostgreSQL (локальная установка)                         |
| ORM                | TypeORM                                                  |
| Очередь jobs       | Статусы в БД + воркер в том же процессе Nest (без Redis) |
| Файлы              | Локальный диск                                           |
| Изображения        | Sharp                                                    |
| Документы          | LibreOffice (headless), системная установка              |
| Auth (UI)          | JWT в httpOnly cookie                                    |
| Хэш паролей        | argon2                                                   |
| Rate limit         | `@nestjs/throttler`                                      |
| MIME (magic bytes) | file-type                                                |
| Upload             | multer (через Nest)                                      |
| Cron / TTL         | `@nestjs/schedule`                                       |
| Telegram           | Mock-модуль (живой Bot API позже)                        |
| Unit-тесты         | Vitest                                                   |
| E2E                | Playwright                                               |
| DX                 | **Oxlint** + **Turborepo** + **pnpm**                    |
| Структура репо     | **Monorepo** (`apps/web`, `apps/api`) + Turborepo        |
| Package manager    | **pnpm**                                                 |

---

## 2. Frontend

| Технология     | Назначение                                                                       |
| -------------- | -------------------------------------------------------------------------------- |
| React 18+      | UI: главная, auth, ЛК, share, API docs                                           |
| TypeScript     | Типы сущностей и API-ответов                                                     |
| Vite           | Dev-server и сборка SPA                                                          |
| React Router   | Маршруты `/`, `/login`, `/register`, `/account`, `/s/:token`, `/api-docs` и т.д. |
| SCSS Modules   | Стили экранов и компонентов                                                      |
| react-dropzone | Drag-and-drop, загрузка одного файла                                             |
| Zustand        | Состояние текущей конвертации и polling                                          |
| fetch          | Upload, polling статусов jobs                                                    |

---

## 3. Backend

| Пакет / слой        | Назначение                                                              |
| ------------------- | ----------------------------------------------------------------------- |
| NestJS              | Модули, DI, guards, pipes, REST                                         |
| multer (через Nest) | Multipart upload одного файла                                           |
| `@nestjs/throttler` | Rate limit (лимиты — в [`technical-task.md`](./technical-task.md) §7.6) |
| cookie + JWT        | Сессия UI в httpOnly cookie                                             |
| argon2              | Хэш паролей                                                             |
| file-type           | MIME / magic bytes                                                      |
| dotenv              | Конфиг                                                                  |

---

## 4. Движки конвертации

| Направление      | Технология             | Комментарий                              |
| ---------------- | ---------------------- | ---------------------------------------- |
| JPG / JPEG → PNG | Sharp                  | Быстро, без внешних бинарников           |
| PNG → JPG / JPEG | Sharp                  | То же                                    |
| DOCX → PDF       | LibreOffice (headless) | Системная установка LibreOffice в PATH   |
| PDF → DOCX       | LibreOffice (headless) | То же; качество зависит от структуры PDF |

---

## 5. Хранение файлов

| Параметр | Значение                                                                     |
| -------- | ---------------------------------------------------------------------------- |
| Тип      | Локальный диск                                                               |
| Каталоги | `storage/uploads/`, `storage/results/`, `storage/profile/`                   |
| Ключ     | По `job_id` / `file_id`                                                      |
| Защита   | Запрет path traversal; отдача только через контролируемые download-эндпоинты |

---

## 6. Интеграции

| Интеграция                                 | v1                                            | Позже            |
| ------------------------------------------ | --------------------------------------------- | ---------------- |
| Telegram (восстановление пароля, привязка) | Mock: эмуляция кода / bind без реального бота | Telegram Bot API |

---

## 7. Тесты и качество

| Технология | Назначение                                                 |
| ---------- | ---------------------------------------------------------- |
| Vitest     | Unit: валидация MIME, лимиты, пары форматов, хэш API-ключа |
| Playwright | E2E: convert одного файла, share link, API auth            |
| Oxlint     | Линтинг JS/TS/React                                        |

---

## 8. Структура репозитория (зафиксировано)

**Выбор:** monorepo + **Turborepo** (вариант B).

| Путь        | Содержимое                                            |
| ----------- | ----------------------------------------------------- |
| `apps/web`  | React + Vite frontend                                 |
| `apps/api`  | NestJS backend                                        |
| `packages/` | Общие пакеты при необходимости (типы, eslint…)        |
| корень      | `pnpm-workspace.yaml`, `turbo.json`, общие DX-скрипты |

Workspaces через **pnpm**. Turborepo оркестрирует `dev` / `build` / `lint` / `test` по приложениям с
кэшем задач.

**Не используем:** npm/yarn как основной менеджер; два отдельных репозитория; monorepo без
Turborepo.

---

## 9. Зафиксированные решения (сводка)

| Вопрос              | Решение                                       |
| ------------------- | --------------------------------------------- |
| Package manager     | **pnpm**                                      |
| Структура репо      | Monorepo + Turborepo (`apps/web`, `apps/api`) |
| LibreOffice         | Системная установка (бинарь в PATH)           |
| Backend / БД / ORM  | NestJS + TypeORM + PostgreSQL                 |
| PostgreSQL локально | **Локальная установка** (не Docker Compose)   |
| Очередь             | Статусы в БД + воркер в процессе Nest         |
| Изображения         | Sharp                                         |
| Документы           | LibreOffice headless                          |

Открытых решений по стеку нет.
