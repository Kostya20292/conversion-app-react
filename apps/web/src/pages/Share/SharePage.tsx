import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert } from '@/components/Alert/Alert';
import { Button } from '@/components/Button/Button';
import { Toast } from '@/components/Toast/Toast';
import { isUnavailableSharePreview } from '@/features/share/isUnavailableSharePreview';
import { formatFileSize } from '@/lib/formatFileSize';
import type { ShareFileMeta } from '@/types/share';
import styles from './SharePage.module.scss';

const PREVIEW_SHARE_FILE: ShareFileMeta = {
  name: 'presentation.png',
  format: 'PNG',
  sizeBytes: 1_048_576,
  expiresAt: '2026-08-20T15:00:00.000Z',
};

const formatShareExpiry = (iso: string): string => {
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));

  return `до ${formatted}`;
};

type ShareAvailableCardProps = {
  file: ShareFileMeta;
  onDownload: () => void;
};

const ShareAvailableCard = ({ file, onDownload }: ShareAvailableCardProps) => (
  <div className={styles.card}>
    <h1 className={styles.title}>{file.name}</h1>
    <p className={styles.lead}>Файл доступен по ссылке. Вход не нужен.</p>

    <Alert variant="info" className={styles.notice}>
      Метаданные пока статические. Скачивание подключится после API.
    </Alert>

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
        <dd>{formatShareExpiry(file.expiresAt)}</dd>
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

const ShareUnavailableCard = () => (
  <div className={styles.card}>
    <h1 className={styles.title}>Ссылка больше недоступна</h1>
    <p className={styles.lead}>
      Срок действия истёк или ссылку отозвали. Попросите новую у того, кто ею поделился.
    </p>
    <div className={styles.actions}>
      <Link to="/" className={styles.primaryLink}>
        Сконвертировать свой файл
      </Link>
    </div>
  </div>
);

export const SharePage = () => {
  const { token } = useParams();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isUnavailable = isUnavailableSharePreview(token);

  const handleDownload = () => {
    setToastMessage('Скачивание подключится на следующем этапе.');
  };

  const handleCloseToast = () => {
    setToastMessage(null);
  };

  return (
    <div className="container narrowPage">
      {isUnavailable ? (
        <ShareUnavailableCard />
      ) : (
        <ShareAvailableCard file={PREVIEW_SHARE_FILE} onDownload={handleDownload} />
      )}
      <Toast open={Boolean(toastMessage)} message={toastMessage ?? ''} onClose={handleCloseToast} />
    </div>
  );
};
