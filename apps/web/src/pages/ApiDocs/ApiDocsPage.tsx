import { ButtonLink } from '@/components/ButtonLink/ButtonLink';
import styles from './ApiDocsPage.module.scss';

export const ApiDocsPage = () => (
  <div className={`container ${styles.page}`}>
    <h1 className={styles.title}>API Convertly</h1>
    <p className={styles.lead}>
      Публичное API для конвертации файлов. Авторизация через заголовок <code>X-API-Key</code>.
    </p>

    <section className={styles.section} aria-labelledby="quickstart-title">
      <h2 id="quickstart-title" className={styles.sectionTitle}>
        Быстрый старт
      </h2>
      <ol className={styles.list}>
        <li>Зарегистрируйтесь и получите API-ключ в личном кабинете.</li>
        <li>Отправьте файл на конвертацию с заголовком X-API-Key.</li>
        <li>Опрашивайте статус задачи и скачайте результат по signed URL.</li>
      </ol>
    </section>

    <section className={styles.section} aria-labelledby="limits-title">
      <h2 id="limits-title" className={styles.sectionTitle}>
        Лимиты v1
      </h2>
      <ul className={styles.list}>
        <li>1 файл за операцию, до 10 МБ</li>
        <li>Таймаут конвертации — 60 секунд</li>
        <li>API convert — 30 запросов / час / ключ</li>
      </ul>
    </section>

    <section className={styles.section} aria-labelledby="example-title">
      <h2 id="example-title" className={styles.sectionTitle}>
        Пример
      </h2>
      <pre className={styles.code}>
        <code>{`curl -X POST https://api.example/api/v1/convert \\
  -H "X-API-Key: cv_live_..." \\
  -F "file=@photo.jpg" \\
  -F "target=png"`}</code>
      </pre>
    </section>

    <div className={styles.cta}>
      <ButtonLink to="/register">Получить API-ключ</ButtonLink>
    </div>
  </div>
);
