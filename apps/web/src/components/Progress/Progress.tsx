import clsx from 'clsx';
import type { ProgressProps } from './Progress.types';
import styles from './Progress.module.scss';

export const Progress = ({
  value = 0,
  indeterminate = false,
  label = 'Прогресс',
  className,
}: ProgressProps) => {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={clsx(styles.progressWrap, className)}>
      <div
        className={clsx(styles.progress, indeterminate && styles.indeterminate)}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : clamped}
      >
        {!indeterminate ? (
          <span className={styles.bar} style={{ width: `${clamped}%` }} />
        ) : (
          <span className={styles.bar} />
        )}
      </div>
    </div>
  );
};
