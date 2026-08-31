# План реализации бэкенда: Convertly (v1)

Пошаговый план для `apps/api`. Источники правды:

| Документ                                                             | Что брать                                                                     |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [technical-task.md](./technical-task.md)                             | Сущности §3, auth §6, jobs/API §7, TTL §2.2, лимиты §7.6, ошибки §7.5, UC §12 |
| [architecture.md](./architecture.md)                                 | Модули §3.2, `storage/` §3.3, поток jobs §4.1, один процесс Nest §5–6         |
| [tech-stack.md](./tech-stack.md)                                     | NestJS, TypeORM, PostgreSQL, Sharp, LibreOffice, argon2, throttler, Vitest    |
| [frontend-implementation-plan.md](./frontend-implementation-plan.md) | Контракт, который ждёт SPA (этапы B–G)                                        |

Стек и границы v1 **фиксированы** — альтернативы не предлагать. HTTP, worker и cron TTL — **один
процесс** Nest; без Redis, BullMQ, S3 и Docker Compose для PostgreSQL.

**Прогресс:** §1–15 готовы (этап **I**: unit, HTTP, Playwright). Фронт закрыл A2, **B–G**.

---

## 0. Исходное состояние

Уже есть: monorepo pnpm (`apps/*`), `apps/web` (SPA), `apps/api` (Nest, §1), `turbo.json`, `docs/`,
`.gitignore` на `storage/` и `.env`.

**Цель плана:** поднять `apps/api` слой за слоем, с проверяемым результатом на каждом этапе, и
отдать фронту стабильный HTTP-контракт.

**Зависимость от фронта:** бизнес-логика только здесь. SPA не кладёт `X-API-Key` в браузер
([architecture.md](./architecture.md) §3.1). Гостевая конвертация — отдельный UI-канал (cookie /
IP), не публичный `/api/v1`.

---

## 0.1. Текущий фокус: v1 закрыт

Auth cookie, jobs, worker, signed download, shares, StoredFile, `/api/v1`, recovery, **rate limit +
TTL-cron** и минимум тестов (§15) закрыты.

| #   | Что делать сейчас                                                         | Где в плане | Статус |
| --- | ------------------------------------------------------------------------- | ----------- | ------ |
| 1   | `apps/api`: Nest + pnpm `@convertly/api`, корневые скрипты, Vitest ≠ Jest | §1          | ✅     |
| 2   | Env, CORS, TypeORM → локальный PostgreSQL, каталоги `storage/`            | §1          | ✅     |
| 3   | Конверт ошибок `{ error: { code, message } }`, ValidationPipe             | §2          | ✅     |
| 4   | Сущности User / Job / File / Share / ApiKey                               | §3          | ✅     |
| 5   | Auth cookie: register / login / logout / me                               | §4          | ✅     |
| 6   | Users и API-ключи: PATCH /me, ключ при register, reissue                  | §5          | ✅     |
| 7   | UI + v1 jobs: upload → queued, GET статуса, владение                      | §7          | ✅     |
| 8   | Worker + signed download (гость)                                          | §8          | ✅     |
| 9   | Shares: create / public GET+download / list / revoke → 410                | §10         | ✅     |
| 10  | StoredFile: save_conversions, GET/DELETE files, signed download           | §9          | ✅     |
| 11  | Telegram mock: bind/unbind, forgot/reset                                  | §11         | ✅     |
| 12  | Rate limit convert/login + cron TTL uploads/results/orphans               | §13         | ✅     |

**Не делаем в v1:** Redis, отдельный worker-сервис, 2FA, антивирус, batch, горизонтальный scale
(вариант A — [architecture.md](./architecture.md) §5.3).

---

## 1. Фундамент: Nest, конфиг, БД, storage

**Зачем:** точка входа API в монорепо ([architecture.md](./architecture.md) §3.2,
[tech-stack.md](./tech-stack.md) §3, §8).

| Шаг | Действие                                                                                             | Критерий готовности                                          | Статус |
| --- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ |
| 1.1 | `apps/api` через Nest CLI, пакет `@convertly/api`, TypeScript strict                                 | `pnpm --filter @convertly/api start:dev` слушает порт        | ✅     |
| 1.2 | Корневые скрипты: `dev` / `build` / `lint` / `test` для web+api; завести `turbo.json` по стеку       | Из корня поднимаются оба приложения                          | ✅     |
| 1.3 | `ConfigModule` + `.env.example`: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `STORAGE_ROOT`, `PORT` | Секреты только из env; `.env` не в git                       | ✅     |
| 1.4 | TypeORM + PostgreSQL (локальная установка). Dev: `synchronize: true`. Prod: `synchronize: false`     | При старте таблицы создаются                                 | ✅     |
| 1.5 | CORS: allowlist origin SPA, `credentials: true`. Cookie-сессия через Vite proxy `/api` → Nest        | Preflight ок; cookie не требует `SameSite=None` на localhost | ✅     |
| 1.6 | Каталоги `storage/uploads`, `storage/results`, `storage/profile` (корень репо, не `apps/api`)        | Папки есть, в git только через `.gitignore`                  | ✅     |
| 1.7 | `GET /api/health` → `{ status: "ok" }`                                                               | Проверка, что процесс жив                                    | ✅     |

Глобальный префикс: `api`. Тесты — **Vitest** (не Jest из шаблона Nest). Линтер — Oxlint, как в
монорепо.

**Вне scope этапа:** бизнес-эндпоинты.

---

## 2. Общий слой: ошибки, валидация, guards

**Зачем:** один конверт ошибок для UI и `/api/v1` ([technical-task.md](./technical-task.md) §7.5).
Сообщения API — **английские**; русский текст собирает фронт.

| Шаг | Действие                                                       | Критерий готовности                             | Статус |
| --- | -------------------------------------------------------------- | ----------------------------------------------- | ------ |
| 2.1 | Exception filter → `{ error: { code, message } }`              | Нет Nest-stack в теле ответа клиенту            | ✅     |
| 2.2 | `ValidationPipe`: whitelist, forbid non-whitelisted, transform | Лишние поля DTO → `invalid_request`             | ✅     |
| 2.3 | Коды из §7.5: HTTP + `error.code` совпадают с таблицей ТЗ      | `file_too_large` → 413 и т.д.                   | ✅     |
| 2.4 | Каркас `@nestjs/throttler` (лимиты навешиваем в §13)           | Модуль подключён                                | ✅     |
| 2.5 | `JwtAuthGuard` (cookie) и `ApiKeyGuard` (`X-API-Key`)          | Неверный ключ / нет сессии → `401 unauthorized` | ✅     |

**Конверт (обязательный):**

```json
{
  "error": {
    "code": "file_too_large",
    "message": "File exceeds the 10 MB limit"
  }
}
```

`504 conversion_timeout` в таблице ТЗ — код ошибки движка. Для polling: `GET` job всегда **200**,
если job существует; таймаут пишется в `status: failed` + `error.code`. Download у failed job — не
отдаёт файл (`410` / `conversion_failed`).

Логи: job id, user id, статус; **не** логировать пароли, полный API-ключ, JWT, тела файлов.

---

## 3. Модель данных (TypeORM)

**Зачем:** сущности из [technical-task.md](./technical-task.md) §3.2. Id — UUID.

| Entity          | Ключевые поля (не полный DDL)                                                                                         | Статус |
| --------------- | --------------------------------------------------------------------------------------------------------------------- | ------ |
| `User`          | email (unique, ci), passwordHash, displayName, telegramId, saveConversions default `false`, tokenVersion, timestamps  | ✅     |
| `ConversionJob` | userId nullable, sourceFormat, targetFormat, status, sourceOfRequest `ui`\|`api`, errorCode, sizes, paths, timestamps | ✅     |
| `StoredFile`    | userId, jobId, name, storageKey, size, source `ui`\|`api`                                                             | ✅     |
| `ShareLink`     | token unique, ownerUserId nullable, jobId / fileId, expiresAt, revokedAt                                              | ✅     |
| `ApiKey`        | userId, keyHash, prefix (`cv_live_ab12…`), createdAt, revokedAt                                                       | ✅     |
| `PasswordReset` | userId, codeHash, expiresAt (15 мин), consumedAt                                                                      | ✅     |
| `TelegramBind`  | userId, bindToken, expiresAt (для mock deep-link)                                                                     | ✅     |

Статусы job: `queued` → `processing` → `completed` \| `failed`. Других статусов нет.

Индексы: `Job.status` (выборка очереди), `ShareLink.token`, `ApiKey.prefix`, `User.email`.

---

## 4. Auth: сессия SPA

**Зачем:** ЛК и персональные настройки ([technical-task.md](./technical-task.md) §6). JWT в
**httpOnly** cookie — не `localStorage`.

| Шаг | Действие                                                                                         | Критерий готовности                                | Статус |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ------ |
| 4.1 | `POST /api/auth/register`: имя, email, пароль; argon2; `save_conversions=false`; автологин       | 201 + cookie; повтор email → «уже зарегистрирован» | ✅     |
| 4.2 | Правила пароля на сервере: ≥8, ≥1 буква, ≥1 цифра                                                | Слабый пароль → 400, без записи User               | ✅     |
| 4.3 | `POST /api/auth/login`: email+пароль; «Запомнить меня»                                           | Неверные данные → одно сообщение, без enumeration  | ✅     |
| 4.4 | Cookie: httpOnly; `Secure` в prod; `SameSite=Lax`; remember → maxAge **30 суток**, иначе session | Фронтовый чекбокс управляет TTL                    | ✅     |
| 4.5 | `GET /api/auth/me`                                                                               | 200 с user либо 401                                | ✅     |
| 4.6 | `POST /api/auth/logout`                                                                          | Cookie снята; `tokenVersion++` (инвалидация JWT)   | ✅     |
| 4.7 | Смена пароля / email (см. §5) тоже бампит `tokenVersion`                                         | Старая cookie после смены пароля не проходит       | ✅     |

Login throttle — §13 (10 / 15 мин / IP).

Forgot/reset — §12 (после mock Telegram). На этапе 4 достаточно заглушек 501 **не** делать:
эндпоинты появятся в §12, до этого их нет.

**Критерий:** curl register → me → logout → me = 401.

---

## 5. Users и API-ключи

**Зачем:** UC-02, ЛК ([technical-task.md](./technical-task.md) §4.5).

| Шаг | Действие                                                                                                   | Критерий готовности                   | Статус |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------ |
| 5.1 | `PATCH /api/users/me` — display name                                                                       | Имя в `GET /me` обновлено             | ✅     |
| 5.2 | Смена email: текущий пароль + уникальность                                                                 | Занятый email → понятная ошибка       | ✅     |
| 5.3 | Смена пароля: текущий + новый (те же правила)                                                              | Старый пароль больше не логинит       | ✅     |
| 5.4 | Toggle `save_conversions`; выкл **не** удаляет StoredFile и **не** отзывает share                          | Как §8 ТЗ                             | ✅     |
| 5.5 | При регистрации сразу создать **один** активный ApiKey; plaintext **один раз** в ответе register / reissue | В БД только hash + prefix             | ✅     |
| 5.6 | `GET /api/api-keys` — prefix + маска, без полного ключа                                                    | Повторный GET не возвращает plaintext | ✅     |
| 5.7 | `POST /api/api-keys/reissue` — старый revoked, новый plaintext один раз                                    | Старый `X-API-Key` → 401              | ✅     |

Формат ключа: `cv_live_` + криптослучайная строка. Сравнение — по hash (не по prefix).

---

## 6. Storage и валидация файла

**Зачем:** локальный диск без path traversal ([architecture.md](./architecture.md) §3.3).

| Шаг | Действие                                                              | Критерий готовности                         | Статус |
| --- | --------------------------------------------------------------------- | ------------------------------------------- | ------ |
| 6.1 | Модуль `storage`: запись/чтение/удаление только внутри `STORAGE_ROOT` | `../` в ключе → ошибка, файл не пишется     | ✅     |
| 6.2 | Имена на диске = `job_id` / `file_id`, не имя пользователя            | Нет original filename в пути                | ✅     |
| 6.3 | Multer: ровно 1 файл, лимит **10 МБ** (отсечь до записи)              | 2 файла → `invalid_request`; >10 МБ → 413   | ✅     |
| 6.4 | Magic bytes через `file-type`; сверка с расширением и парой форматов  | JPG, названный `.png` → `invalid_file_type` | ✅     |
| 6.5 | 0 байт → ошибка (как ТЗ §5.1)                                         | Job не создаётся                            | ✅     |

Пары v1 (whitelist, не blacklist):

| source                  | target | Движок      |
| ----------------------- | ------ | ----------- |
| jpg/jpeg (`image/jpeg`) | png    | Sharp       |
| png (`image/png`)       | jpg    | Sharp       |
| docx (OOXML MIME)       | pdf    | LibreOffice |
| pdf (`application/pdf`) | docx   | LibreOffice |

Иная пара → `unsupported_conversion`.

PNG→JPG: прозрачность на белый фон (зафиксировано). Качество JPEG — константа (например 90).

---

## 7. Jobs: UI-канал и публичный API

**Зачем:** одна операция = один файл; UI и API — одна модель polling
([architecture.md](./architecture.md) §4.1).

Два HTTP-контура, **один** `JobsService`:

| Канал         | Prefix         | Auth                      | Кто            |
| ------------- | -------------- | ------------------------- | -------------- |
| SPA           | `/api/jobs`    | гость (IP) или cookie JWT | Convertly UI   |
| Публичный API | `/api/v1/jobs` | `X-API-Key`               | внешний клиент |

Гость **не** ходит в `/api/v1` без ключа — это следует из ТЗ §7.1 и из того, что у гостя ключа нет.

| Шаг | Действие                                                                                           | Критерий готовности                               | Статус |
| --- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------ |
| 7.1 | `POST …/jobs` multipart: `file` + `target_format`                                                  | 202 `{ id, status: "queued" }`; файл в `uploads/` | ✅     |
| 7.2 | `GET …/jobs/:id` — владелец (cookie / ключ) или 404                                                | Чужой job → `not_found` (без утечки)              | ✅     |
| 7.3 | Поля completed: `source_format`, `target_format`, `download_url`, `expires_at`, `saved_to_profile` | Как пример ТЗ §7.2                                | ✅     |
| 7.4 | `source_of_request`: `ui` на `/api/jobs`, `api` на `/api/v1/jobs`                                  | В StoredFile потом видно источник                 | ✅     |
| 7.5 | Гость: `user_id = null`; user: из JWT; API: из ключа                                               | Guest job не попадает в ЛК                        | ✅     |

`target_format`: `png` \| `jpg` \| `pdf` \| `docx`.

Polling интервал **2 с** — ответственность клиента, не сервера.

**Сейчас:** POST/GET на `/api/jobs` и `/api/v1/jobs`; worker доводит job до `completed` / `failed`.
GET completed отдаёт `download_url`, `expires_at`, `saved_to_profile: false` (профиль — §9).

---

## 8. Движки, worker, download

**Зачем:** HTTP не блокируется на LibreOffice ([architecture.md](./architecture.md) §4.1, §5).

| Шаг  | Действие                                                                             | Критерий готовности                    | Статус |
| ---- | ------------------------------------------------------------------------------------ | -------------------------------------- | ------ |
| 8.1  | `conversion`: Sharp (JPG↔PNG), LibreOffice headless (DOCX↔PDF) через Docker          | Юнит на фикстуре JPG→PNG без HTTP      | ✅     |
| 8.2  | Worker в том же процессе: claim `queued` → `processing` (атомарно, `SKIP LOCKED`)    | Два тика не берут один job             | ✅     |
| 8.3  | Concurrency: **1** LibreOffice, до **2** Sharp одновременно                          | Очередь растёт, процесс не съедает RAM | ✅     |
| 8.4  | Таймаут движка **60 с** → `failed` + `conversion_timeout`                            | Job не висит в `processing`            | ✅     |
| 8.5  | Успех: результат в `results/<job_id>/`, исходник из `uploads/` удалить               | TTL исходника соблюдён на happy-path   | ✅     |
| 8.6  | Ошибка движка → `failed` + `conversion_failed`                                       | GET отдаёт код, файл результата нет    | ✅     |
| 8.7  | Signed download token TTL **15 мин** (`common/`)                                     | Просроченный token → `410 gone`        | ✅     |
| 8.8  | `GET /api/jobs/:id/download` — cookie владельца **или** signed query                 | Гость скачивает по URL из completed    | ✅     |
| 8.9  | `GET /api/v1/jobs/:id/download` — только ключ владельца (без публичного вечного URL) | Чужой ключ → 404                       | ✅     |
| 8.10 | Нет статической раздачи `storage/`                                                   | Прямой GET файла с диска невозможен    | ✅     |

Нет Docker-образа LibreOffice и нет `soffice` в PATH: job `failed` (`conversion_failed`), в логах —
причина. Не маскировать под timeout.

**Критерий этапа:** гость через curl: POST UI-job → poll → download PNG/PDF.

---

## 9. Сохранение в профиль (`StoredFile`)

**Зачем:** [technical-task.md](./technical-task.md) §8, UC-03.

| Условие                        | Поведение                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| Гость                          | StoredFile **нет**; только `results/` + share                                       |
| User, `save_conversions=false` | То же                                                                               |
| User, `save_conversions=true`  | Копия/перенос в `profile/<user_id>/<file_id>/` + ряд в БД; `saved_to_profile: true` |

| Шаг | Действие                                                              | Критерий готовности                   | Статус |
| --- | --------------------------------------------------------------------- | ------------------------------------- | ------ |
| 9.1 | После completed применить таблицу выше                                | Toggle влияет только на **новые** job | ✅     |
| 9.2 | `GET /api/files` + `GET /api/v1/files`                                | Список владельца, не чужие            | ✅     |
| 9.3 | `DELETE /api/files/:id` (+ v1) — диск + БД; связанные share → revoked | GET share → gone                      | ✅     |
| 9.4 | Скачать StoredFile: signed URL или ключ / cookie владельца            | TTL 15 мин на signed                  | ✅     |

---

## 10. Shares

**Зачем:** UC-06, ТЗ §9. Пароля на ссылку нет.

| Шаг  | Действие                                                           | Критерий готовности                                   | Статус |
| ---- | ------------------------------------------------------------------ | ----------------------------------------------------- | ------ |
| 10.1 | `POST /api/shares` и `POST /api/v1/shares`: `job_id` или `file_id` | Гость — только свой completed job                     | ✅     |
| 10.2 | Token криптослучайный; default `expires_at` = **+7 дней**          | URL для SPA: `/s/:token`                              | ✅     |
| 10.3 | `GET /api/v1/public/s/:token` — метаданные без логина              | Имя, формат, размер, TTL; без данных владельца        | ✅     |
| 10.4 | Download по token (тот же public-префикс)                          | Отдаётся **результат**, не исходник                   | ✅     |
| 10.5 | `GET /api/shares` + v1 — список активных владельца                 | Гость без ЛК список не видит                          | ✅     |
| 10.6 | `DELETE /api/shares/:token` (+ v1) — revoke                        | Дальше 410 и «ссылка недоступна» на фронте            | ✅     |
| 10.7 | Истёк TTL или revoked → `410 gone`                                 | Без различия «истекла / отозвана» в деталях владельца | ✅     |

**Критерий этапа:** гость `POST /api/shares` на completed job → public GET + download PNG; владелец
отзывает → `410 gone`.

---

## 11. Telegram mock и восстановление пароля

**Зачем:** UC-04. Живой бот — grammY + `TELEGRAM_BOT_TOKEN`. Без токена и в тестах — mock
([tech-stack.md](./tech-stack.md) §6).

| Шаг  | Действие                                                                                | Критерий готовности                                  | Статус |
| ---- | --------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------ |
| 11.1 | `POST /api/users/me/telegram/bind` → bind token; mock-confirm в dev (без внешнего бота) | В профиле статус «привязан», есть `telegram_id`      | ✅     |
| 11.2 | Unbind с предупреждением (логика сервера: просто отвязать)                              | Recovery после unbind недоступен                     | ✅     |
| 11.3 | `POST /api/auth/forgot-password` — **одинаковый** нейтральный ответ всегда              | Нет enumeration, есть аккаунт или нет                | ✅     |
| 11.4 | Если Telegram привязан — сохранить код (hash), TTL **15 мин**; cooldown **60 с**        | Повтор раньше 60 с — ошибка cooldown                 | ✅     |
| 11.5 | Mock «доставляет» код: лог + dev-only выдача **запрещена** в prod                       | В prod код не светить в HTTP ответа forgot           | ✅     |
| 11.6 | `POST /api/auth/reset-password`: код + новый пароль                                     | Успех → можно login; неверный/протухший код — ошибка | ✅     |

Нейтральный текст forgot согласован с ТЗ §4.4 / §6.2 (фронт показывает RU).

---

## 12. Публичное API `/api/v1` (сводка)

Поверх тех же сервисов, что UI. Полная таблица ТЗ §7.3:

| Метод  | Путь                               | Auth    |
| ------ | ---------------------------------- | ------- |
| POST   | `/api/v1/jobs`                     | API key |
| GET    | `/api/v1/jobs/:id`                 | API key |
| GET    | `/api/v1/jobs/:id/download`        | API key |
| GET    | `/api/v1/me`                       | API key |
| GET    | `/api/v1/files`                    | API key |
| GET    | `/api/v1/files/:id/download`       | API key |
| DELETE | `/api/v1/files/:id`                | API key |
| POST   | `/api/v1/shares`                   | API key |
| GET    | `/api/v1/shares`                   | API key |
| DELETE | `/api/v1/shares/:token`            | API key |
| GET    | `/api/v1/public/s/:token`          | —       |
| GET    | `/api/v1/public/s/:token/download` | —       |

Без ключа / неверный ключ → `401 unauthorized`. Файлы с `save_conversions` сохраняются так же, как
из UI.

SPA-контракт (cookie), который ждёт
[frontend-implementation-plan.md](./frontend-implementation-plan.md) §4:

| Метод  | Путь                            | Auth             |
| ------ | ------------------------------- | ---------------- |
| POST   | `/api/auth/register`            | —                |
| POST   | `/api/auth/login`               | —                |
| POST   | `/api/auth/logout`              | cookie           |
| GET    | `/api/auth/me`                  | cookie           |
| POST   | `/api/auth/forgot-password`     | —                |
| POST   | `/api/auth/reset-password`      | —                |
| PATCH  | `/api/users/me`                 | cookie           |
| POST   | `/api/users/me/telegram/bind`   | cookie           |
| POST   | `/api/users/me/telegram/unbind` | cookie           |
| GET    | `/api/api-keys`                 | cookie           |
| POST   | `/api/api-keys/reissue`         | cookie           |
| POST   | `/api/jobs`                     | cookie \| гость  |
| GET    | `/api/jobs/:id`                 | cookie \| гость  |
| GET    | `/api/files`                    | cookie           |
| GET    | `/api/files/:id/download`       | cookie \| signed |
| DELETE | `/api/files/:id`                | cookie           |
| POST   | `/api/shares`                   | cookie \| гость  |
| GET    | `/api/shares`                   | cookie           |
| DELETE | `/api/shares/:token`            | cookie           |

Владение job:

| Job                      | `GET /api/jobs/:id` и download                                                        |
| ------------------------ | ------------------------------------------------------------------------------------- |
| Гость (`user_id` пустой) | По `id` (иначе SPA не сможет поллить без сессии). Скачивание — signed URL, TTL 15 мин |
| Пользователь             | Только владелец (cookie). Чужой id → `not_found`                                      |

---

## 13. Rate limit и TTL-cron

**Зачем:** ТЗ §7.6 и §2.2; [architecture.md](./architecture.md) §4.3.

| Канал              | Лимит            | Ключ лимита | Статус |
| ------------------ | ---------------- | ----------- | ------ |
| API convert        | 30 / час / ключ  | ApiKey id   | ✅     |
| UI convert (гость) | 10 / час / IP    | IP          | ✅     |
| UI convert (user)  | 60 / час / user  | User id     | ✅     |
| Login              | 10 / 15 мин / IP | IP          | ✅     |

429 → `rate_limited` + заголовок/тело, из которого фронт может взять «подождите N сек»
(Retry-After).

| Cron                  | Правило                                                            | Статус |
| --------------------- | ------------------------------------------------------------------ | ------ |
| uploads               | Удалить после успеха job **или** старше **1 ч**                    | ✅     |
| results (без профиля) | Старше **24 ч** с `finished_at`; скачивание срок **не** продлевает | ✅     |
| shares                | `expires_at` в прошлом — недоступны (410); файлы по своим TTL      | ✅     |
| signed tokens         | Проверка подписи+exp при запросе, отдельный cron не нужен          | —      |
| orphan-файлы на диске | Периодически убрать файлы без живого job/StoredFile                | ✅     |

`@nestjs/schedule` в том же процессе.

---

## 14. Модули (целевая раскладка)

Как в [architecture.md](./architecture.md) §3.2. Не складывать всю логику в `AppModule`.

| Модуль       | Когда появляется     |
| ------------ | -------------------- |
| `common`     | §2, signed tokens §8 |
| `storage`    | §6                   |
| `auth`       | §4, §11              |
| `users`      | §5                   |
| `api-keys`   | §5                   |
| `jobs`       | §7                   |
| `conversion` | §8                   |
| `worker`     | §8                   |
| `files`      | §9                   |
| `shares`     | §10                  |
| `telegram`   | §11 (mock)           |
| `cleanup`    | §13                  |

---

## 15. Тесты

Протокол черновик → заморозка — [testing.mdc](../.cursor/rules/testing.mdc). Не подгонять тесты под
код. Моки приложения не используем; LibreOffice в CI может отсутствовать.

| Тип         | Инструмент | Где                         | Минимальный набор v1                                                        | Статус |
| ----------- | ---------- | --------------------------- | --------------------------------------------------------------------------- | ------ |
| Unit        | Vitest     | `apps/api/src/**/*.test.ts` | Пароль; пары форматов; magic bytes; 10 МБ; hash API-ключа; signed token TTL | ✅     |
| HTTP        | Vitest     | `apps/api/test/`            | register/login; guest POST job + GET status; API 401 без ключа; share 410   | ✅     |
| E2E продукт | Playwright | `apps/web/e2e/`             | Гость convert; share open/download; register → ключ в ЛК                    | ✅     |

Unit: пароль, пары, magic bytes, 10 МБ, hash ключа, JPG↔PNG движок, signed token TTL — есть. HTTP:
register/login, guest POST job + GET, API 401 без ключа, guest download по signed URL, share 410,
rate limit §7.6, TTL-cleanup — есть. LibreOffice: HTTP-кейс DOCX→PDF гонять, если собран
Docker-образ или `soffice` в PATH, иначе не skip смысла кейса — гонять локально, в среде без движка
не ослаблять assert.

---

## 16. Рекомендуемый порядок спринтов

Порядок совпадает с тем, как фронт ждёт Nest
([frontend-implementation-plan.md](./frontend-implementation-plan.md) §14).

| Этап  | Содержание                           | Разблокирует фронт      | Статус |
| ----- | ------------------------------------ | ----------------------- | ------ |
| **A** | §1–3 фундамент, ошибки, сущности     | —                       | ✅     |
| **B** | §4 auth cookie                       | Фронт B (сессия, guard) | ✅     |
| **C** | §6–8 storage, jobs, worker, download | Фронт C (гость convert) | ✅     |
| **D** | §10 shares                           | Фронт D                 | ✅     |
| **E** | §5 + §9 ключи, профиль, files        | Фронт E (живой ЛК)      | ✅     |
| **F** | §7 `/api/v1` поверх тех же сервисов  | UC-02 curl, `/api-docs` | ✅     |
| **G** | §11 Telegram mock + reset            | Фронт F                 | ✅     |
| **H** | §13 rate limit + cron                | Фронт G (429, TTL)      | ✅     |
| **I** | §15 тесты                            | Регрессия               | ✅     |

Этап **C:** storage, HTTP jobs, worker и signed download закрыты. Этап **D:** shares (UI + v1 +
public). Этап **E:** StoredFile после `save_conversions`, `GET/DELETE /api/files` и v1, signed
download. Этап **F:** `POST/GET /api/v1/jobs`, download, `GET /api/v1/me`, shares v1 и **files v1**
живые; фронт `/api-docs` закрыт по этому канону. Этап **G:** Telegram mock bind/unbind,
forgot/reset. Этап **H:** login/convert throttler + `CleanupService` (uploads 1 ч, results 24 ч,
orphans). Этап **I:** HTTP/unit минимума и Playwright (гость convert, share, register → ключ)
зелёные.

Легенда: ✅ готово · 🟡 частично · ⬜ не начато · ⏸ ждём другую сторону.

---

## 17. Handshake с фронтом (обязательно отдать)

Когда этап закрыт, фронту достаточно:

1. Origin API и Vite `server.proxy`: `/api` → Nest.
2. Имена cookie не важны SPA (httpOnly); нужны `credentials: 'include'`.
3. Таблицы эндпоинтов §12.
4. Конверт ошибок §2; коды = ТЗ §7.5.
5. Polling: `queued` \| `processing` каждые 2 с; стоп на `completed` / `failed`.
6. `download_url` уже с signed token (или относительный путь + token).
7. Register отдаёт plaintext API-ключа **один раз** (ЛК потом только prefix/маска).

Менять пути после этапа B без правки фронтового плана — нельзя: синхронизировать оба плана.

---

## 18. Definition of Done (бэкенд v1)

- [x] `apps/api` стартует, TypeORM видит PostgreSQL, `storage/` не в git
- [x] Гость: `POST /api/jobs` → poll → signed download (UC-01)
- [x] Auth: register (автологин, ключ один раз), login («запомнить меня»), logout, `GET /me`
- [x] Пароли argon2; login без enumeration; правила пароля на сервере
- [x] `/api/v1/*` только с ключом; hash+prefix в БД — jobs, `GET /me`, shares, files
- [x] `save_conversions` default false; вкл → StoredFile; выкл не трогает старые
- [x] Share: создать (гость и user), public GET, revoke → 410
- [x] MIME по magic bytes; 1 файл; 10 МБ; таймаут движка 60 с
- [x] Rate limits §7.6; cron TTL исходников/результатов/shares
- [x] Telegram — grammY при токене; mock без токена и в тестах; в production mock выключен
- [x] Ошибки API на английском в конверте `{ error: { code, message } }`
- [x] Unit + HTTP-тесты минимума §15 зелёные — auth, jobs, signed download, share 410, rate limit,
      TTL; Playwright — гость convert, share, register → ключ в ЛК
- [x] Нет раздачи `storage/` статикой; нет секретов в репо

---

## 19. Связанные документы

| Документ                                                             | Роль                         |
| -------------------------------------------------------------------- | ---------------------------- |
| [technical-task.md](./technical-task.md)                             | Продукт, API, лимиты, UC     |
| [architecture.md](./architecture.md)                                 | Слои, модули, storage, scale |
| [tech-stack.md](./tech-stack.md)                                     | Зафиксированный стек         |
| [frontend-implementation-plan.md](./frontend-implementation-plan.md) | Что ждёт SPA                 |
