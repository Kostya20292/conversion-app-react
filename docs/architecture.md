# Архитектура: Convertly (v1)

Краткий обзор слоёв системы. Продуктовые требования — `[technical-task.md](./technical-task.md)`,
стек — `[tech-stack.md](./tech-stack.md)`.

---

## 1. Цель архитектуры

Разделить UI, API, доменную логику конвертации, хранение файлов и фоновые задачи так, чтобы:

- гость и пользователь работали через один backend;
- UI и публичный API использовали одну модель **jobs + polling**;
- конвертация (Sharp / LibreOffice) не блокировала HTTP-поток дольше, чем нужно для приёма файла и
  постановки в очередь.

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

Telegram — **mock-модуль** внутри API (без отдельного сервиса).

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

React + Vite + TypeScript + SCSS Modules. Только UI: экраны, формы, upload, polling. Бизнес-логика
конвертации на сервере.

```
apps/web/
├── src/
│   ├── app/                 # провайдеры, роутер, layout
│   ├── pages/
│   │   ├── Home/            # `/` — dropzone, конвертация, результат
│   │   ├── Login/           # `/login`
│   │   ├── Register/        # `/register`
│   │   ├── ForgotPassword/  # `/forgot-password`
│   │   ├── ResetPassword/   # `/reset-password`
│   │   ├── Account/         # `/account` — профиль, ключ, файлы, shares
│   │   ├── Share/           # `/s/:token` — публичное скачивание
│   │   └── ApiDocs/         # `/api-docs`
│   ├── components/          # Header, Footer, Dropzone, JobStatus, …
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
| `pages/`              | Маршруты из `[technical-task.md](./technical-task.md)` §4                |
| `features/conversion` | Состояние одной операции: selected file → upload → poll → download/share |
| `api/`                | Тонкий HTTP-клиент; ошибки UI — на русском                               |
| SCSS Modules          | Стили экранов и компонентов                                              |

**Компонент = папка.** В одном файле и в одной папке — один компонент. Не складывать два виджета
вместе (`Input` и `FieldError`, `Spinner` и `Progress` — отдельные папки).

| Файл                    | Когда                                                                 |
| ----------------------- | --------------------------------------------------------------------- |
| `Component.tsx`         | всегда                                                                |
| `Component.module.scss` | стили этого компонента; не общий stylesheet страницы на несколько tsx |
| `Component.types.ts`    | локальные пропсы/варианты. Нет пропсов — файла нет                    |

`pages/Account/`, `pages/Share/` — папки **маршрута**: `*Page.tsx` и стили страницы в корне
маршрута, секции и карточки — вложенные папки (`AccountProfileSection/`, `ShareAvailableCard/`, …).

Типы компонента: `import type { X } from './Component.types'`. Не реэкспортировать их из tsx.
Доменные сущности (`StoredFile`, `ShareFileMeta`) живут в `src/types/`, не в `.types.ts` виджета.

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

Публичные префиксы: `/api/auth/*` (cookie), `/api/v1/*` (API-ключ), плюс отдача файлов только через
контролируемые download-эндпоинты.

### 3.3. `storage/` — что это и зачем

Это **не** папка с кодом. Это локальный диск, куда Nest кладёт **реальные байты файлов** (загрузки и
результаты). В PostgreSQL хранятся метаданные (`job_id`, путь/ключ, размер, TTL); сами `.jpg` /
`.pdf` и т.д. лежат здесь.

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
4. Если `save_conversions` вкл — файл попадает в `storage/profile/<user_id>/<file_id>/…`, появляется
   в ЛК.

Клиент **никогда** не ходит в `storage/` напрямую (нет статической раздачи папки). Скачивание только
через API: signed URL (TTL 15 мин) или `X-API-Key` владельца / публичный share-token. Запрет path
traversal — в модуле `storage`.

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

Если у пользователя `save_conversions = true` — при успехе создаётся `StoredFile` в
`storage/profile/`. Подробности — `[technical-task.md](./technical-task.md)` §7–8.

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

## 5. Масштабирование

### 5.1. Что заложено

Архитектура: один процесс Nest = HTTP + worker + cron, файлы на **локальном диске**, очередь —
строки `ConversionJob` в PostgreSQL (без Redis).

| Вопрос                         | Ответ для v1                                                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Упадёт ли сервер при всплеске? | Не обязан «сразу упасть»: rate limit режет входящий поток, jobs принимаются асинхронно. Но при перегрузке растут latency HTTP, очередь и нагрузка на CPU/RAM/диск (особенно LibreOffice). |
| Будут ли jobs долго в очереди? | **Да**, если параллельных конвертаций больше, чем worker успевает. JPG↔PNG (Sharp) быстрее; DOCX↔PDF (LibreOffice) — узкое место.                                                         |
| Можно ли быстро scale up/down? | **Нет горизонтально «из коробки».** Быстрый рычаг — вертикально (больше CPU/RAM на одной машине) + жёсткий **concurrency** worker’а + rate limit.                                         |

Защита от обвала (уже в ТЗ):

- rate limit: гость 10/ч/IP, user 60/ч, API 30/ч/ключ (`[technical-task.md](./technical-task.md)`
  §7.6);
- таймаут конвертации 60 сек → job `failed`, а не вечный hang;
- рекомендуется **лимит одновременных** `processing` (например 1–2 LibreOffice), иначе один процесс
  съест всю RAM.

Итого: система **деградирует очередью и 429/таймаутами**, а не обязана молча падать; «бесконечно
много параллельных конвертаций» она не вытянет.

### 5.2. Почему нельзя просто запустить N копий Nest

| Ограничение                | Почему мешает                                                |
| -------------------------- | ------------------------------------------------------------ |
| Локальный `storage/`       | Два инстанса не видят файлы друг друга                       |
| Worker в том же процессе   | Несколько реплик без координации могут взять один job дважды |
| LibreOffice в процессе API | Тяжёлая конвертация конкурирует с HTTP за ресурсы            |

### 5.3. Путь масштабирования позже — вариант A

Зафиксированный следующий шаг (без ломки jobs + polling): **разделить роли** API и worker, общее
хранилище файлов.

```
Сейчас
  [Web SPA] → [Nest: API + Worker + Disk] → [PostgreSQL]

Вариант A — разделить роли
  [Web] → [API × N] → [PostgreSQL]
              ↓
         [Worker × M] → [shared storage]
```

| Что меняем                                               | Эффект                                                           |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| Вынести worker в отдельный процесс/сервис                | HTTP не тормозит из‑за LibreOffice                               |
| Общее файловое хранилище (S3 / MinIO)                    | Несколько API и worker видят одни и те же файлы                  |
| Несколько worker’ов + безопасный claim job из PostgreSQL | Очередь разгребается быстрее; можно +/− число worker по нагрузке |
| API — stateless                                          | Реплики API масштабируются по CPU/RPS                            |

**Уменьшение нагрузки:** снизить число worker-реплик (очередь подрастёт, сервис жив) и/или число
API. До перехода на A: concurrency worker’а, rate limit, вертикальный апгрейд машины.

### 5.4. Вне scope сейчас

Автоскейлинг k8s, Redis/BullMQ, CDN для фронта как отдельный этап — **не фиксируем**; целевой путь
масштабирования — **вариант A** выше.

---

## 6. Границы и вне scope v1

**Внутри одного процесса Nest:** HTTP + job worker + cron (без Redis, без отдельного
worker-сервиса).

**Не делаем в v1:** пакетная конвертация, отдельный object storage / CDN, живой Telegram Bot API,
антивирус, 2FA, Docker Compose для PostgreSQL, горизонтальный автоскейл воркеров.

---

## 7. Связанные документы

| Документ                                   | Что там                                        |
| ------------------------------------------ | ---------------------------------------------- |
| `[technical-task.md](./technical-task.md)` | Сущности, экраны, API, лимиты, сценарии        |
| `[tech-stack.md](./tech-stack.md)`         | Конкретные библиотеки и зафиксированные выборы |
