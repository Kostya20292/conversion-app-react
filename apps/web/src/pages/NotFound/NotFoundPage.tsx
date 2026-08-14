import { ButtonLink } from '@/components/ButtonLink/ButtonLink';
import styles from './NotFoundPage.module.scss';

export const NotFoundPage = () => (
  <div className="container narrowPage">
    <div className={styles.card}>
      <h1 className={styles.title}>Страница не найдена</h1>
      <p className={styles.lead}>Такой страницы нет. Вернитесь на главную и сконвертируйте файл.</p>
      <div className={styles.actions}>
        <ButtonLink to="/" fullWidth>
          На главную
        </ButtonLink>
      </div>
    </div>
  </div>
);
