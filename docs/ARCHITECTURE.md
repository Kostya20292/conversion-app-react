# Архитектура: Convertly (v1)

Краткий обзор слоёв системы. Продуктовые требования — [`TZ.md`](./TZ.md), стек — [`TECH_STACK.md`](./TECH_STACK.md).

Статус: **черновик v1** (можно расширять).

---

## 1. Цель архитектуры

Разделить UI, API, доменную логику конвертации, хранение файлов и фоновые задачи так, чтобы:

- гость и пользователь работали через один backend;
- UI и публичный API использовали одну модель **jobs + polling**;
- конвертация (Sharp / LibreOffice) не блокировала HTTP-поток дольше, чем нужно для приёма файла и постановки в очередь.

---

## 2. Общая схема слоёв

```
┌─────────────────────────────────────────────────────────┐
│  Browser (React SPA)                                    │
│  apps/web — UI, Zustand (job/polling), React Router     │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS (JSON / multipart)
                           ▼
┌─────────────────────────────────────────────────────────┐
│  API Gateway layer (NestJS)                             │
│  apps/api                                               │
│  • REST /api/v1/*  (API-ключ)                           │
│  • /api/auth/*     (JWT в httpOnly cookie)              │
│  • guards, throttling, validation, signed download      │
└──────────────────────────┬──────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────────┐
│ Domain services │ │ Job worker  │ │ File storage        │
│ Auth, Users,    │ │ (тот же     │ │ storage/uploads/    │
│ Jobs, Files,    │ │  процесс    │ │ storage/results/    │
│ Shares, ApiKeys │ │  Nest)      │ │ storage/profile/    │
└────────┬────────┘ └──────┬──────┘ └─────────────────────┘
         │                 │
         ▼                 ▼
┌─────────────────┐ ┌─────────────────────┐
│ PostgreSQL      │ │ Conversion engines  │
│ (TypeORM)       │ │ Sharp · LibreOffice │
└─────────────────┘ └─────────────────────┘
```

| Слой        | Ответственность                                                               |
| ----------- | ----------------------------------------------------------------------------- |
| **Web**     | Экраны, upload, polling статуса job, отображение ошибок (RU)                  |
| **API**     | Auth, rate limit, валидация MIME/размера/пар форматов, выдача signed download |
| **Domain**  | Пользователи, jobs, StoredFile, ShareLink, ApiKey                             |
| **Worker**  | Забирает `queued` → `processing` → движок → `completed` / `failed`            |
| **Storage** | Локальные файлы по `job_id` / `file_id`; отдача только через API              |
| **Engines** | JPG↔PNG (Sharp), DOCX↔PDF (LibreOffice headless)                              |

Telegram в v1 — **mock-модуль** внутри API (без отдельного сервиса).

---

## 3. Структура репозитория

```
conversion-app-react/
├── apps/web/          # React + Vite + SCSS Modules
├── apps/api/          # NestJS + TypeORM
├── packages/          # общие типы / eslint (по мере надобности)
├── storage/           # локальные файлы (не в git)
├── docs/
├── pnpm-workspace.yaml
└── turbo.json
```

### 3.1. `apps/web` — frontend

React + Vite + TypeScript + SCSS Modules. Только UI: экраны, формы, upload, polling. Бизнес-логика конвертации на сервере.

```
apps/web/
├── src/
│   ├── app/                 # провайдеры, роутер, layout (Header/Footer)
│   ├── pages/
│   │   ├── Home/            # `/` — dropzone, конвертация, результат
│   │   ├── Login/           # `/login`
│   │   ├── Register/        # `/register`
│   │   ├── ForgotPassword/  # `/forgot-password`
│   │   ├── ResetPassword/   # `/reset-password`
│   │   ├── Account/         # `/account` — профиль, ключ, файлы, shares
│   │   ├── Share/           # `/s/:token` — публичное скачивание
│   │   └── ApiDocs/         # `/api-docs`
│   ├── components/          # Dropzone, JobStatus, ShareButton, …
│   ├── features/
│   │   └── conversion/      # Zustand: текущий job, polling каждые 2 сек
│   ├── api/                 # fetch-обёртки к Nest (auth cookie / X-API-Key не в SPA для API-ключа)
│   ├── styles/              # глобальные токены / reset
│   └── main.tsx
├── index.html
├── vite.config.ts
└── package.json
```

| Часть                 | Зачем                                                                    |
| --------------------- | ------------------------------------------------------------------------ |
| `pages/`              | Маршруты из [`TZ.md`](./TZ.md) §4                                        |
| `features/conversion` | Состояние одной операции: selected file → upload → poll → download/share |
| `api/`                | Тонкий HTTP-клиент; ошибки UI — на русском                               |
| SCSS Modules          | Стили экранов и компонентов                                              |

### 3.2. `apps/api` — backend

NestJS: HTTP, доменные модули, job-worker и cron очистки — **в одном процессе**.

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── auth/                # login/register/logout, JWT cookie, forgot/reset
│   ├── users/               # профиль, save_conversions, смена email/пароля
│   ├── api-keys/            # выдача / перевыпуск, hash + prefix
│   ├── jobs/                # POST/GET jobs, download; создание ConversionJob
│   ├── files/               # StoredFile: список / удаление из профиля
│   ├── shares/              # create / list / revoke; GET public /s/:token
│   ├── conversion/          # движки: Sharp, LibreOffice adapter
│   ├── storage/             # запись/чтение/удаление на диске (без path traversal)
│   ├── worker/              # polling queued jobs → processing → engines
│   ├── cleanup/             # @nestjs/schedule: TTL uploads/results/shares
│   ├── telegram/            # mock: код сброса / bind (живой Bot API позже)
│   └── common/              # guards, throttler, pipes, signed download tokens
├── test/
└── package.json
```

| Модуль           | Ответственность                                            |
| ---------------- | ---------------------------------------------------------- |
| `auth` / `users` | Сессия UI (cookie), профиль                                |
| `api-keys`       | Ключи для `/api/v1/*`                                      |
| `jobs`           | Приём файла, валидация MIME/размера/пары форматов, статусы |
| `conversion`     | Вызов Sharp / LibreOffice                                  |
| `storage`        | Работа с каталогами на диске (см. §3.3)                    |
| `worker`         | Фоновая обработка очереди из PostgreSQL                    |
| `cleanup`        | Удаление просроченных файлов и share-ссылок                |
| `telegram`       | Эмуляция восстановления пароля и привязки                  |

Публичные префиксы: `/api/auth/*` (cookie), `/api/v1/*` (API-ключ), плюс отдача файлов только через контролируемые download-эндпоинты.

### 3.3. `storage/` — что это и зачем

Это **не** папка с кодом. Это локальный диск, куда Nest кладёт **реальные байты файлов** (загрузки и результаты). В PostgreSQL хранятся метаданные (`job_id`, путь/ключ, размер, TTL); сами `.jpg` / `.pdf` и т.д. лежат здесь.

Каталог в `.gitignore` — в репозиторий бинарники не коммитим.

```
storage/
├── uploads/     # исходники сразу после upload (до/во время job)
├── results/     # временные результаты конвертации (гость / save_conversions=false)
└── profile/     # файлы, сохранённые в ЛК (StoredFile, бессрочно до удаления)
```

| Каталог    | Что лежит                       | Когда появляется                  | Когда удаляется                                                |
| ---------- | ------------------------------- | --------------------------------- | -------------------------------------------------------------- |
| `uploads/` | Один исходный файл на job       | `POST` job                        | После успеха job **или** max **1 час** с upload (fail/abandon) |
| `results/` | Результат конвертации           | Worker завершил job успешно       | **24 часа** с завершения, если не сохранён в профиль           |
| `profile/` | Копия/перенос результата для ЛК | Успех + `save_conversions = true` | Ручное удаление пользователем (и связанные shares отзываются)  |

Пример жизненного цикла:

1. Пользователь загружает `report.docx` → файл пишется в `storage/uploads/<job_id>/…`.
2. Worker конвертирует → PDF в `storage/results/<job_id>/…`, исходник из `uploads/` удаляется.
3. Если `save_conversions` выкл (или гость) — PDF живёт в `results/` до 24 ч / share.
4. Если `save_conversions` вкл — файл попадает в `storage/profile/<user_id>/<file_id>/…`, появляется в ЛК.

Клиент **никогда** не ходит в `storage/` напрямую (нет статической раздачи папки). Скачивание только через API: signed URL (TTL 15 мин) или `X-API-Key` владельца / публичный share-token. Запрет path traversal — в модуле `storage`.

---

## 4. Потоки (кратко)

### 4.1. Конвертация (UI и API)

```
Клиент → POST job (multipart) → валидация → файл в uploads/
       → запись ConversionJob (queued)
       → 202 { id, status }
       → Worker: processing → engine → results/
       → completed | failed
Клиент → GET job каждые 2 сек → download (signed token / API-ключ)
```

Если у пользователя `save_conversions = true` — при успехе создаётся `StoredFile` в `storage/profile/`. Подробности — [`TZ.md`](./TZ.md) §7–8.

### 4.2. Auth UI vs API

| Канал               | Механизм                                   |
| ------------------- | ------------------------------------------ |
| SPA (ЛК, настройки) | JWT в httpOnly cookie                      |
| Публичный API       | заголовок `X-API-Key`                      |
| Share `/s/:token`   | секретный token + TTL / отзыв (без логина) |

### 4.3. TTL и очистка

Cron в процессе Nest (`@nestjs/schedule`):

- исходники — до конца job или max 1 час;
- результаты без профиля — 24 часа;
- share — 7 суток (по умолчанию);
- signed download — 15 минут.

---

## 5. Границы и вне scope v1

**Внутри одного процесса Nest:** HTTP + job worker + cron (без Redis, без отдельного worker-сервиса).

**Не делаем в v1:** пакетная конвертация, отдельный object storage / CDN, живой Telegram Bot API, антивирус, 2FA, Docker Compose для PostgreSQL.

---

## 6. Связанные документы

| Документ                           | Что там                                        |
| ---------------------------------- | ---------------------------------------------- |
| [`TZ.md`](./TZ.md)                 | Сущности, экраны, API, лимиты, сценарии        |
| [`TECH_STACK.md`](./TECH_STACK.md) | Конкретные библиотеки и зафиксированные выборы |
