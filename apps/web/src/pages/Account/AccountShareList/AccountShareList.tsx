import { Button } from '@/components/Button/Button';
import { formatDateTime } from '@/lib/formatDateTime';
import type { AccountShareListProps } from './AccountShareList.types';
import styles from './AccountShareList.module.scss';

export const AccountShareList = ({ shares, onCopy, onRevoke }: AccountShareListProps) => (
  <section className={styles.card} aria-labelledby="shares-title">
    <h2 id="shares-title" className={styles.sectionTitle}>
      Активные ссылки
    </h2>
    {shares.length === 0 ? (
      <p className={styles.empty}>Активных ссылок нет. Поделитесь файлом после конвертации.</p>
    ) : (
      <ul className={styles.list}>
        {shares.map((share) => (
          <li key={share.id} className={styles.listItem}>
            <div className={styles.listBody}>
              <p className={styles.listUrl}>{share.url}</p>
              <p className={styles.listMeta}>
                <span>{share.fileName}</span>
                <span>до {formatDateTime(share.expiresAt)}</span>
              </p>
            </div>
            <div className={styles.listActions}>
              <Button variant="tertiary" onClick={() => onCopy(share)}>
                Копировать
              </Button>
              <Button variant="danger" onClick={() => onRevoke(share)}>
                Отозвать
              </Button>
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>
);
