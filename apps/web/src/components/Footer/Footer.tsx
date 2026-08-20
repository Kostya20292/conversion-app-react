import styles from './Footer.module.scss';

export const Footer = () => (
  <footer className={styles.footer}>
    <div className={`container ${styles.inner}`}>
      <p>© Convertly 2026 — конвертация файлов онлайн</p>
    </div>
  </footer>
);
