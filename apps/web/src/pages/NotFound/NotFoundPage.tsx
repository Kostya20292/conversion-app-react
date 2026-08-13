import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.scss';

export const NotFoundPage = () => (
  <div className="container narrowPage">
    <div className={styles.card}>
      <h1 className={styles.title}>Страница не найдена</h1>
      <p className={styles.lead}>Такой страницы нет. Вернитесь на главную и сконвертируйте файл.</p>
      <div className={styles.actions}>
        <Link to="/" className="buttonLink buttonLinkFull">
          На главную
        </Link>
      </div>
    </div>
  </div>
);
