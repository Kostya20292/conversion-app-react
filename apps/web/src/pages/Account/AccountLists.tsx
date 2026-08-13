import { Link } from 'react-router-dom';
import { Button } from '@/components/Button/Button';
import { formatFileSize } from '@/lib/formatFileSize';
import type { ShareLinkItem, StoredFile } from '@/types/account';
import styles from './AccountPage.module.scss';

type AccountFileListProps = {
  files: readonly StoredFile[];
  onDownload: (file: StoredFile) => void;
  onShare: (file: StoredFile) => void;
  onDelete: (file: StoredFile) => void;
};

type AccountShareListProps = {
  shares: readonly ShareLinkItem[];
  onCopy: (share: ShareLinkItem) => void;
  onRevoke: (share: ShareLinkItem) => void;
};

const FILE_SOURCE_LABEL = {
  ui: 'UI',
  api: 'API',
} as const;

const formatDateTime = (iso: string): string =>
  new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));

export const AccountFileList = ({ files, onDownload, onShare, onDelete }: AccountFileListProps) => (
  <section className={styles.card} aria-labelledby="files-title">
    <h2 id="files-title" className={styles.sectionTitle}>
      Сохранённые файлы
    </h2>
    {files.length === 0 ? (
      <p className={styles.empty}>
        Пока нет файлов. Включите сохранение и{' '}
        <Link to="/" className={styles.inlineLink}>
          сконвертируйте файл
        </Link>
        .
      </p>
    ) : (
      <ul className={styles.list}>
        {files.map((file) => (
          <li key={file.id} className={styles.listItem}>
            <div className={styles.listBody}>
              <p className={styles.listName}>{file.name}</p>
              <p className={styles.listMeta}>
                <span>{file.format}</span>
                <span>{formatFileSize(file.sizeBytes)}</span>
                <span>{formatDateTime(file.createdAt)}</span>
                <span>{FILE_SOURCE_LABEL[file.source]}</span>
              </p>
            </div>
            <div className={styles.listActions}>
              <Button variant="tertiary" onClick={() => onDownload(file)}>
                Скачать
              </Button>
              <Button variant="tertiary" onClick={() => onShare(file)}>
                Поделиться
              </Button>
              <Button variant="danger" onClick={() => onDelete(file)}>
                Удалить
              </Button>
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>
);

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
