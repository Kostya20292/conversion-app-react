---
name: Convertly
description:
  Тёмная спокойная SaaS-система для веб-сервиса конвертации файлов. Один синий акцент для CTA, фокус
  на dropzone и ясном статусе задачи.
colors:
  primary: '#4C8DFF'
  primary-hover: '#6BA0FF'
  primary-pressed: '#3A78E8'
  primary-muted: '#1A2F4D'
  secondary: '#8B95A8'
  tertiary: '#5B8DEF'
  neutral: '#0B0F14'
  surface: '#121820'
  surface-raised: '#1A222D'
  surface-overlay: '#222C3A'
  on-surface: '#E8EDF5'
  on-surface-muted: '#9AA3B5'
  border: '#2A3545'
  border-strong: '#3D4B5F'
  success: '#3DCF8E'
  success-muted: '#143528'
  warning: '#E6B84D'
  warning-muted: '#3A2F12'
  error: '#F07178'
  error-muted: '#3A181C'
  focus-ring: '#4C8DFF'
typography:
  headline-display:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.55
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-lg:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.3
  label-md:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.3
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: 0.02em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.55
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.45
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  gutter: 24px
  margin: 24px
  section: 64px
rounded:
  none: 0px
  sm: 6px
  md: 10px
  lg: 14px
  xl: 20px
  full: 9999px
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.neutral}'
    typography: '{typography.label-lg}'
    rounded: '{rounded.md}'
    padding: 12px
    height: 44px
  button-primary-hover:
    backgroundColor: '{colors.primary-hover}'
  button-primary-active:
    backgroundColor: '{colors.primary-pressed}'
  button-secondary:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.on-surface}'
    typography: '{typography.label-lg}'
    rounded: '{rounded.md}'
    padding: 12px
    height: 44px
  button-tertiary:
    backgroundColor: transparent
    textColor: '{colors.primary}'
    typography: '{typography.label-lg}'
    rounded: '{rounded.md}'
    padding: 12px
    height: 44px
  button-danger:
    backgroundColor: '{colors.error}'
    textColor: '{colors.neutral}'
    typography: '{typography.label-lg}'
    rounded: '{rounded.md}'
    padding: 12px
    height: 44px
  input-default:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface}'
    typography: '{typography.body-md}'
    rounded: '{rounded.md}'
    padding: 12px
    height: 44px
  dropzone-idle:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.on-surface-muted}'
    rounded: '{rounded.lg}'
  dropzone-drag-over:
    backgroundColor: '{colors.primary-muted}'
    textColor: '{colors.on-surface}'
  chip-segment:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.on-surface-muted}'
    typography: '{typography.label-md}'
    rounded: '{rounded.md}'
    padding: 8px
  chip-segment-active:
    backgroundColor: '{colors.primary-muted}'
    textColor: '{colors.primary}'
  card-surface:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.on-surface}'
    rounded: '{rounded.lg}'
    padding: 24px
  tooltip-default:
    backgroundColor: '{colors.surface-overlay}'
    textColor: '{colors.on-surface}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.sm}'
    padding: 8px
---

# Convertly — Design System

## Overview

**Convertly** — веб-сервис конвертации файлов онлайн. Визуальный язык: спокойный тёмный SaaS,
ориентированный на аналоги [ILovePDF](https://www.ilovepdf.com/), [Convertio](https://convertio.co/)
и [Smallpdf](https://smallpdf.com/) — без маркетингового шума и без «cyber glow».

**Личность бренда:** быстрый, ясный, надёжный инструмент. Пользователь (гость или
зарегистрированный) должен за секунды понять: выбрать тип конвертации → загрузить один файл →
получить результат.

**Аудитория:** люди, которым нужен один файл «сюда → туда», и разработчики, которым нужен API-ключ и
понятная документация.

**Эмоциональный отклик UI:** уверенность и спокойствие. Интерфейс плотный по смыслу, но воздушный по
ритму; главный герой экрана — зона загрузки и CTA «Конвертировать», а не иллюстрации и промо-блоки.

**Тёмная тема — единственная.** Светлая тема в v1 не предусмотрена: все поверхности, текст и
состояния заданы для тёмного фона.

---

## Colors

Палитра строится на глубоком нейтральном фоне и **одном синем акценте** для первичных действий.
Остальные цвета — семантические статусы и слои поверхностей.

- **Primary (#4C8DFF):** Electric Azure — единственный драйвер взаимодействия: primary-кнопки,
  активный сегмент типа конвертации, ссылки, focus ring.
- **Primary muted (#1A2F4D):** приглушённый синий для hover-фона сегментов, drag-over dropzone и
  мягких подсветок без свечения.
- **Secondary (#8B95A8):** Slate Mist — вторичный текст, подписи, метаданные (размер файла, TTL,
  префикс API-ключа).
- **Neutral / canvas (#0B0F14):** Midnight Ink — фон страницы.
- **Surface (#121820 → #1A222D → #222C3A):** слои карточек, панелей, модалок и меню — через тон, не
  через тень.
- **On-surface (#E8EDF5):** основной текст на тёмном.
- **Border (#2A3545):** разделители и контуры полей; `#3D4B5F` — усиленная граница
  (focus/error/drag-over).
- **Success / Warning / Error:** только для статусов job, тостов и валидации — не для декора.

Контраст текста к фону — не ниже WCAG AA (4.5:1 для обычного текста, 3:1 для крупного).

---

## Typography

Одна гарнитура UI — **Manrope** (геометрический humanist sans): читаемая в формах, списках ЛК и на
главной. Для API docs и технических фрагментов — **JetBrains Mono**.

- **Headlines (Manrope 600–700):** бренд и заголовки экранов; на главной имя **Convertly** —
  hero-уровень, сильнее подзаголовка.
- **Body (Manrope 400, 14–18px):** инструкции, описания, тексты ошибок рядом с зоной действия.
- **Labels (Manrope 500–600):** кнопки, табы сегментов, поля форм, чипы статуса job.
- **Code (JetBrains Mono):** примеры `curl` / `fetch`, `error.code`, префикс ключа `cv_live_…`.

Не смешивать больше двух начертаний Manrope на одном экране без необходимости. Не использовать
системные стеки как основной шрифт продукта.

---

## Layout

Раскладка: **fluid на mobile**, **fixed max-width на desktop** (контент до **1120px**,
центрирование). Header и footer на всю ширину; рабочая зона — в контейнере.

- Базовая сетка отступов — **8px** (полушаг `xs = 4px` для микровыравниваний).
- Внутренние отступы карточек и панелей — **24px** (`lg`).
- Секции на главной разделяются **48–64px**, чтобы dropzone оставался визуальным якорем первого
  экрана.
- Главная (`/`): вертикальный поток — Hero (бренд + короткий подзаголовок) → сегмент типа
  конвертации → Dropzone → CTA → статус/результат. Без боковых коллажей и без «лендинговой» простыни
  в первом viewport.
- ЛК (`/account`): одна колонка на mobile; на desktop — профиль/настройки сверху или слева, списки
  файлов и share-ссылок ниже/справа без перегруза дашбордом.
- Auth и share-страницы: узкая колонка формы/карточки (**max ~420–480px**), центрирование.
- API docs: широкая читаемая колонка с таблицами и блоками кода; боковая навигация по якорям —
  опционально на desktop.

Адаптив обязателен: dropzone и CTA удобны для тача (min hit-area ~44px).

---

## Elevation & Depth

Глубина — через **тональные слои**, а не через многослойные тени и glow.

1. Canvas `#0B0F14`
2. Surface `#121820` / raised `#1A222D`
3. Overlay `#222C3A` (модалки, меню, tooltip)

Тени — только лёгкие, почти прозрачные (`rgba(0,0,0,0.35)` blur 16–24px), преимущественно у модалок
и выпадающих меню. Карточки на главной и в ЛК отделяются границей `{colors.border}` и сдвигом тона,
без «парящих» блоков.

Запрещены неоновые обводки, цветные glow вокруг CTA и glassmorphism как основной приём.

---

## Shapes

Язык форм — **мягкая инженерия**: достаточно скругления, чтобы UI выглядел современным SaaS, без
«пилюль» на всём подряд.

- Контролы и инпуты: **10px** (`rounded.md`)
- Dropzone, карточки контента, модалки: **14px** (`rounded.lg`)
- Мелкие чипы статуса: **6–10px**
- `rounded.full` — только для аватара/индикатора и toggle-thumb, не для primary-кнопок

Не смешивать острые (0px) и сильно скруглённые (full) углы в одном блоке.

---

## Components

### Buttons

- **Primary:** фон `{colors.primary}`, текст тёмный (`neutral`), высота 44px — одно главное действие
  на экран («Конвертировать», «Скачать», «Войти»).
- **Secondary:** raised surface + border — «Поделиться», «Выбрать файл», вторичные действия в ЛК.
- **Tertiary / ghost:** прозрачный фон, текст primary — текстовые ссылки-действия («Создать
  аккаунт», «Забыли пароль?»).
- **Danger:** для отзыва share-ссылки, удаления файла, подтверждения перевыпуска ключа.
- Disabled: opacity ~0.45, без смены семантики цвета. Primary disabled, пока нет валидного файла.

### Segmented control (тип конвертации)

Табы/сегменты `JPG ↔ PNG` / `DOCX ↔ PDF` на raised-поверхности; активный сегмент — `primary-muted` +
текст `primary`. Не заменять карточками-инструментами на главной в v1.

### Dropzone

Состояния из ТЗ: Idle → Drag-over → Selected → Uploading → Processing → Success → Error.

- Idle: пунктирная/мягкая граница `border`, текст secondary, явный CTA «Выбрать файл».
- Drag-over: граница `primary`, фон `primary-muted` (без glow).
- Error: граница/текст `error`, сообщение рядом с зоной + возможность заменить файл.
- Подсказка лимита всегда видна: 1 файл, до 10 МБ.

### Inputs / forms

Высота 44px, фон `surface`, border `border`, focus — ring `primary` 2px. Ошибки под полем
(`aria-invalid`, `aria-describedby`), общий alert — только для сценариев вроде неверного пароля /
rate limit. Чекбокс «Запомнить меня» и toggle `save_conversions` — стандартный размер
touch-friendly.

### Status / progress

Статусы job (`queued` / `processing` / `completed` / `failed`) — текст + скромный индикатор
(линейный progress или спиннер), цвет success/error только в финале. Без декоративных анимаций,
мешающих восприятию статуса.

### Lists (ЛК)

Список сохранённых файлов и активных share-ссылок: строки с именем, типом, размером, датой,
источником (UI/API); действия скачать / поделиться / удалить / отозвать. Пустое состояние — короткий
текст-онбординг, без иллюстраций-коллажей.

### Modals

Подтверждение перевыпуска API-ключа, «Сессия истекла»: overlay затемнение, панель `surface-overlay`,
один primary и один secondary/cancel. Фокус-трап и закрытие по Escape.

### Toasts / banners

Глобальные сбои (5xx, сеть) и мягкий баннер гостю («Войдите, чтобы сохранять файлы…») — сверху или у
зоны действия; не перекрывать dropzone постоянным sticky-промо.

### API docs blocks

Таблицы эндпоинтов, блоки кода на JetBrains Mono, CTA «Получить API-ключ». Документационный стиль:
плотный, читаемый, без маркетинговых hero.

### Header / Footer

- Header: логотип **Convertly** (клик → `/`), навигация «Конвертация», «API», «Войти» / «ЛК».
- Footer минимальный: `© Convertly 2026 — конвертация файлов онлайн`.

---

## Do's and Don'ts

**Do**

- Держать на первом экране бренд, один короткий подзаголовок, сегмент типа, dropzone и один primary
  CTA.
- Использовать primary-синий только для главного действия и ключевых индикаторов выбора/фокуса.
- Показывать ошибки понятным русским текстом рядом с зоной действия + Retry, где уместно.
- Соблюдать AA-контраст на всех текстовых парах тёмной темы.
- Обеспечивать клавиатурный доступ, `aria-label` у dropzone и иконок, связь ошибок с полями.
- Сохранять спокойный SaaS-ритм: мало декора, много ясности статуса задачи.

**Don't**

- Не делать светлую тему и не смешивать «почти белые» поверхности как основной canvas.
- Не устраивать тёмный cyber-стиль: неон, glow, градиентные обводки, glass ради эффекта.
- Не превращать главную в маркетинговый лендинг со статистикой, коллажами скриншотов и несколькими
  конкурирующими CTA.
- Не использовать больше одного primary CTA на экран.
- Не делать primary-кнопки в виде pill (`rounded.full`).
- Не показывать сырые stack trace / английские API `error.message` как основной UI-текст (в UI —
  русский; английский — в API).
- Не вводить фиолетовые/индиго «AI-default» палитры вместо заданного синего акцента.
