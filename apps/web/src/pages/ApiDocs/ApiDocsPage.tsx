import { useAuthStore } from '@/app/authStore';
import { ButtonLink } from '@/components/ButtonLink/ButtonLink';
import styles from './ApiDocsPage.module.scss';

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/v1/jobs',
    auth: 'X-API-Key',
    purpose: 'Создать задачу: multipart `file` + `target_format`',
  },
  {
    method: 'GET',
    path: '/api/v1/jobs/:id',
    auth: 'X-API-Key',
    purpose: 'Статус задачи (polling каждые 2 с)',
  },
  {
    method: 'GET',
    path: '/api/v1/jobs/:id/download',
    auth: 'X-API-Key',
    purpose: 'Скачать результат по ключу владельца',
  },
  {
    method: 'GET',
    path: '/api/v1/me',
    auth: 'X-API-Key',
    purpose: 'Профиль и флаг save_conversions',
  },
  {
    method: 'GET',
    path: '/api/v1/files',
    auth: 'X-API-Key',
    purpose: 'Список файлов, сохранённых в профиле',
  },
  {
    method: 'GET',
    path: '/api/v1/files/:id/download',
    auth: 'X-API-Key',
    purpose: 'Скачать сохранённый файл',
  },
  {
    method: 'DELETE',
    path: '/api/v1/files/:id',
    auth: 'X-API-Key',
    purpose: 'Удалить файл из профиля',
  },
  {
    method: 'POST',
    path: '/api/v1/shares',
    auth: 'X-API-Key',
    purpose: 'Создать ссылку: `job_id` или `file_id`',
  },
  {
    method: 'GET',
    path: '/api/v1/shares',
    auth: 'X-API-Key',
    purpose: 'Список активных ссылок владельца',
  },
  {
    method: 'DELETE',
    path: '/api/v1/shares/:token',
    auth: 'X-API-Key',
    purpose: 'Отозвать ссылку',
  },
  {
    method: 'GET',
    path: '/api/v1/public/s/:token',
    auth: '—',
    purpose: 'Метаданные публичной ссылки (без ключа)',
  },
  {
    method: 'GET',
    path: '/api/v1/public/s/:token/download',
    auth: '—',
    purpose: 'Скачать файл по публичной ссылке',
  },
] as const;

const API_ERRORS = [
  { http: 400, code: 'invalid_request', when: 'Нет файла, несколько файлов или нет target_format' },
  { http: 400, code: 'unsupported_conversion', when: 'Пара форматов не поддерживается' },
  { http: 400, code: 'invalid_file_type', when: 'MIME или расширение неверны' },
  { http: 413, code: 'file_too_large', when: 'Файл больше 10 МБ' },
  { http: 401, code: 'unauthorized', when: 'Нет ключа или ключ неверный' },
  { http: 404, code: 'not_found', when: 'Задача, файл или ссылка не найдены' },
  { http: 410, code: 'gone', when: 'Истёк срок хранения, ссылка отозвана или истекла' },
  { http: 422, code: 'conversion_failed', when: 'Ошибка движка конвертации' },
  { http: 429, code: 'rate_limited', when: 'Превышен лимит запросов' },
  { http: 500, code: 'internal_error', when: 'Непредвиденная ошибка сервера' },
  { http: 504, code: 'conversion_timeout', when: 'Конвертация дольше 60 секунд' },
] as const;

const CURL_EXAMPLE = `# 1) создать задачу
curl -X POST "https://example.com/api/v1/jobs" \\
  -H "X-API-Key: cv_live_xxx" \\
  -F "file=@document.docx" \\
  -F "target_format=pdf"

# 2) опросить статус
curl "https://example.com/api/v1/jobs/<id>" \\
  -H "X-API-Key: cv_live_xxx"

# 3) скачать результат
curl -O -J "https://example.com/api/v1/jobs/<id>/download" \\
  -H "X-API-Key: cv_live_xxx"`;

const FETCH_EXAMPLE = `const headers = { 'X-API-Key': 'cv_live_xxx' };
const form = new FormData();
form.append('file', file);
form.append('target_format', 'pdf');

const created = await fetch('https://example.com/api/v1/jobs', {
  method: 'POST',
  headers,
  body: form,
});
const { id } = await created.json();

const poll = () =>
  fetch(\`https://example.com/api/v1/jobs/\${id}\`, { headers }).then((res) => res.json());

let job = await poll();
while (job.status === 'queued' || job.status === 'processing') {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  job = await poll();
}

if (job.status === 'completed') {
  const download = await fetch(
    \`https://example.com/api/v1/jobs/\${id}/download\`,
    { headers },
  );
  const blob = await download.blob();
}`;

const COMPLETED_EXAMPLE = `{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "source_format": "docx",
  "target_format": "pdf",
  "download_url": "/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000/download",
  "expires_at": "2026-08-05T12:00:00.000Z",
  "saved_to_profile": true
}`;

const ERROR_EXAMPLE = `{
  "error": {
    "code": "file_too_large",
    "message": "File exceeds the 10 MB limit"
  }
}`;

const TOC = [
  { href: '#intro', label: 'Введение' },
  { href: '#quickstart', label: 'Быстрый старт' },
  { href: '#endpoints', label: 'Эндпоинты' },
  { href: '#examples', label: 'Примеры' },
  { href: '#errors', label: 'Ошибки' },
  { href: '#limits', label: 'Лимиты' },
] as const;

export const ApiDocsPage = () => {
  const isAuthenticated = useAuthStore((state) => state.status) === 'authenticated';

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>API Convertly</h1>
      <p className={styles.lead}>
        Публичное API: базовый URL <code>/api/v1</code>. Авторизация — заголовок{' '}
        <code>X-API-Key</code>. Без ключа или с неверным ключом ответ <code>401 unauthorized</code>.
        Ключ формата <code>cv_live_…</code> выдаётся один раз при регистрации или перевыпуске в ЛК.
      </p>

      <div className={styles.layout}>
        <nav aria-label="Содержание">
          <ul className={styles.toc}>
            {TOC.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.content}>
          <section className={styles.section} aria-labelledby="intro-title" id="intro">
            <h2 id="intro-title" className={styles.sectionTitle}>
              Введение
            </h2>
            <ul className={styles.list}>
              <li>
                Одна операция — один файл. Поля: <code>file</code> и <code>target_format</code> (
                <code>png</code> | <code>jpg</code> | <code>pdf</code> | <code>docx</code>).
              </li>
              <li>Пары v1: JPG ↔ PNG, DOCX ↔ PDF.</li>
              <li>
                Модель jobs + polling: создайте задачу, опрашивайте статус каждые{' '}
                <strong>2 секунды</strong>, пока <code>queued</code> или <code>processing</code>.
                Стоп на <code>completed</code> / <code>failed</code> или по таймауту 60 с.
              </li>
              <li>Скачивание через API — только с ключом владельца, без публичного вечного URL.</li>
              <li>
                Если в профиле включён <code>save_conversions</code>, успешный результат пишется в
                ЛК (источник <code>api</code>).
              </li>
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="quickstart-title" id="quickstart">
            <h2 id="quickstart-title" className={styles.sectionTitle}>
              Быстрый старт
            </h2>
            <ol className={styles.list}>
              <li>Зарегистрируйтесь и скопируйте API-ключ в личном кабинете.</li>
              <li>
                Отправьте <code>POST /api/v1/jobs</code> с заголовком <code>X-API-Key</code>, файлом
                и <code>target_format</code>. Ответ <code>202</code>: <code>id</code> и{' '}
                <code>status: queued</code>.
              </li>
              <li>
                Опрашивайте <code>GET /api/v1/jobs/:id</code> каждые 2 с.
              </li>
              <li>
                При <code>completed</code> скачайте файл: <code>GET /api/v1/jobs/:id/download</code>
                .
              </li>
            </ol>
          </section>

          <section className={styles.section} aria-labelledby="endpoints-title" id="endpoints">
            <h2 id="endpoints-title" className={styles.sectionTitle}>
              Эндпоинты
            </h2>
            <div className={styles.tableWrap}>
              <table className={styles.table} aria-labelledby="endpoints-title">
                <thead>
                  <tr>
                    <th scope="col">Метод</th>
                    <th scope="col">Путь</th>
                    <th scope="col">Auth</th>
                    <th scope="col">Назначение</th>
                  </tr>
                </thead>
                <tbody>
                  {ENDPOINTS.map((row) => (
                    <tr key={`${row.method}-${row.path}`}>
                      <td>
                        <code>{row.method}</code>
                      </td>
                      <td>
                        <code>{row.path}</code>
                      </td>
                      <td>{row.auth === '—' ? '—' : <code>{row.auth}</code>}</td>
                      <td>{row.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="examples-title" id="examples">
            <h2 id="examples-title" className={styles.sectionTitle}>
              Примеры
            </h2>
            <h3 className={styles.subTitle}>curl</h3>
            <pre className={styles.code} role="region" aria-label="Пример curl">
              <code>{CURL_EXAMPLE}</code>
            </pre>
            <h3 className={styles.subTitle}>fetch</h3>
            <pre className={styles.code} role="region" aria-label="Пример fetch">
              <code>{FETCH_EXAMPLE}</code>
            </pre>
            <h3 className={styles.subTitle}>Ответ completed</h3>
            <pre className={styles.code} role="region" aria-label="Пример ответа completed">
              <code>{COMPLETED_EXAMPLE}</code>
            </pre>
          </section>

          <section className={styles.section} aria-labelledby="errors-title" id="errors">
            <h2 id="errors-title" className={styles.sectionTitle}>
              Ошибки
            </h2>
            <p className={styles.note}>
              Тело ошибки всегда в конверте. <code>error.code</code> и <code>error.message</code> —
              на английском.
            </p>
            <pre className={styles.code} role="region" aria-label="Пример ошибки">
              <code>{ERROR_EXAMPLE}</code>
            </pre>
            <div className={styles.tableWrap}>
              <table className={styles.table} aria-labelledby="errors-title">
                <thead>
                  <tr>
                    <th scope="col">HTTP</th>
                    <th scope="col">code</th>
                    <th scope="col">Когда</th>
                  </tr>
                </thead>
                <tbody>
                  {API_ERRORS.map((row) => (
                    <tr key={row.code}>
                      <td>{row.http}</td>
                      <td>
                        <code>{row.code}</code>
                      </td>
                      <td>{row.when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="limits-title" id="limits">
            <h2 id="limits-title" className={styles.sectionTitle}>
              Лимиты v1
            </h2>
            <ul className={styles.list}>
              <li>1 файл за операцию, до 10 МБ</li>
              <li>Таймаут конвертации — 60 секунд</li>
              <li>API convert — 30 запросов / час / ключ</li>
              <li>UI convert (гость) — 10 / час / IP</li>
              <li>UI convert (пользователь) — 60 / час / user</li>
              <li>Вход — 10 попыток / 15 мин / IP</li>
              <li>Signed download в UI — 15 минут; ссылка шаринга по умолчанию — 7 суток</li>
            </ul>
          </section>

          <div className={styles.cta}>
            <ButtonLink to={isAuthenticated ? '/account' : '/register'}>
              Получить API-ключ
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
};
