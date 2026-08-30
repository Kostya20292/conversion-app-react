import { Alert } from '@/components/Alert/Alert';
import { Button } from '@/components/Button/Button';
import { Progress } from '@/components/Progress/Progress';
import { Spinner } from '@/components/Spinner/Spinner';
import type { JobStatusProps } from './JobStatus.types';
import styles from './JobStatus.module.scss';

export const JobStatus = ({ phase, error, onDownload, onShare, onRetry }: JobStatusProps) => (
  <div className={styles.status}>
    {phase === 'uploading' && (
      <Progress indeterminate label="Загрузка файла" className={styles.progress} />
    )}
    {phase === 'processing' && (
      <div className={styles.processing}>
        <Spinner label="Идёт конвертация" />
        <p className={styles.processingLabel} aria-hidden="true">
          Идёт конвертация
        </p>
      </div>
    )}
    {phase === 'completed' && (
      <div className={styles.actions}>
        <Button className={styles.action} onClick={onDownload}>
          Скачать
        </Button>
        <Button variant="secondary" className={styles.action} onClick={onShare}>
          Поделиться
        </Button>
      </div>
    )}
    {phase === 'failed' && (
      <>
        {error && (
          <Alert variant="error" live className={styles.alert}>
            {error}
          </Alert>
        )}
        <Button className={styles.action} onClick={onRetry}>
          Повторить
        </Button>
      </>
    )}
  </div>
);
