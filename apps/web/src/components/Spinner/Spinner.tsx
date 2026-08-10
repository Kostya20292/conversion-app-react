import clsx from 'clsx';
import type { ProgressProps, SpinnerProps } from './Spinner.types';
import styles from './Spinner.module.scss';

export type { ProgressProps, SpinnerProps } from './Spinner.types';

export const Spinner = ({ label = 'Загрузка', className }: SpinnerProps) => (
  <div className={clsx(styles.spinner, className)} role="status" aria-label={label}>
    <span className={styles.circle} aria-hidden="true" />
    <span className={styles.srOnly}>{label}</span>
  </div>
);

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
