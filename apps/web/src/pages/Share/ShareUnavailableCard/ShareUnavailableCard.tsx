import { ButtonLink } from '@/components/ButtonLink/ButtonLink';
import styles from './ShareUnavailableCard.module.scss';

export const ShareUnavailableCard = () => (
  <div className={styles.card}>
    <h1 className={styles.title}>Ссылка больше недоступна</h1>
    <p className={styles.lead}>
      Срок действия истёк или ссылку отозвали. Попросите новую у того, кто ею поделился.
    </p>
    <div className={styles.actions}>
      <ButtonLink to="/" fullWidth>
        Сконвертировать свой файл
      </ButtonLink>
    </div>
  </div>
);
