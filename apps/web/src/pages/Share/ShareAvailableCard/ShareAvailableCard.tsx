import { Link } from 'react-router-dom';
import { Button } from '@/components/Button/Button';
import { formatDateTime } from '@/lib/formatDateTime';
import { formatFileSize } from '@/lib/formatFileSize';
import type { ShareAvailableCardProps } from './ShareAvailableCard.types';
import styles from './ShareAvailableCard.module.scss';

export const ShareAvailableCard = ({ file, onDownload }: ShareAvailableCardProps) => (
  <div className={styles.card}>
    <h1 className={styles.title}>{file.name}</h1>
    <p className={styles.lead}>Файл доступен по ссылке. Вход не нужен.</p>

    <dl className={styles.meta}>
      <div className={styles.metaRow}>
        <dt>Формат</dt>
        <dd>{file.format}</dd>
      </div>
      <div className={styles.metaRow}>
        <dt>Размер</dt>
        <dd>{formatFileSize(file.sizeBytes)}</dd>
      </div>
      <div className={styles.metaRow}>
        <dt>Срок действия</dt>
        <dd>до {formatDateTime(file.expiresAt)}</dd>
      </div>
    </dl>

    <div className={styles.actions}>
      <Button fullWidth aria-label={`Скачать ${file.name}`} onClick={onDownload}>
        Скачать
      </Button>
      <Link to="/" className={styles.link}>
        Сконвертировать свой файл
      </Link>
    </div>
  </div>
);
