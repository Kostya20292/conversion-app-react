import clsx from 'clsx';
import type { SpinnerProps } from './Spinner.types';
import styles from './Spinner.module.scss';

export const Spinner = ({ label = 'Загрузка', className }: SpinnerProps) => (
  <div className={clsx(styles.spinner, className)} role="status" aria-label={label}>
    <span className={styles.circle} aria-hidden="true" />
    <span className={styles.srOnly}>{label}</span>
  </div>
);
