import { Link } from 'react-router-dom';
import { Button } from '@/components/Button/Button';
import { formatDateTime } from '@/lib/formatDateTime';
import { formatFileSize } from '@/lib/formatFileSize';
import type { AccountFileListProps } from './AccountFileList.types';
import styles from './AccountFileList.module.scss';

const FILE_SOURCE_LABEL = {
  ui: 'UI',
  api: 'API',
} as const;

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
