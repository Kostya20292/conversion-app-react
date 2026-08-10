# Convertly

Monorepo конвертера файлов (JPG↔PNG, DOCX↔PDF).

## Структура

```
apps/web   — React + Vite (SPA)
apps/api   — NestJS (позже)
docs/      — ТЗ, архитектура, стек
```

## Запуск

```bash
pnpm install
pnpm dev
```

Скрипты из корня делегируются в `@convertly/web` (`apps/web`).
