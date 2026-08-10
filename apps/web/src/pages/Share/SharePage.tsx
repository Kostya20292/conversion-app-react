import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/Button/Button';
import styles from './SharePage.module.scss';

export const SharePage = () => {
  const { token } = useParams();

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.card}>
        <h1 className={styles.title}>Общий файл</h1>
        <p className={styles.lead}>Публичная ссылка для скачивания без входа.</p>

        <dl className={styles.meta}>
          <div>
            <dt>Токен</dt>
            <dd>
              <code>{token}</code>
            </dd>
          </div>
          <div>
            <dt>Имя</dt>
            <dd>—</dd>
          </div>
          <div>
            <dt>Формат</dt>
            <dd>—</dd>
          </div>
          <div>
            <dt>Размер</dt>
            <dd>—</dd>
          </div>
          <div>
            <dt>Срок</dt>
            <dd>—</dd>
          </div>
        </dl>

        <div className={styles.actions}>
          <Button disabled>Скачать</Button>
          <Link to="/" className={styles.link}>
            Сконвертировать свой файл
          </Link>
        </div>
      </div>
    </div>
  );
};
