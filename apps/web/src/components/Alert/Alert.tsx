import clsx from 'clsx';
import type { AlertProps } from './Alert.types';
import styles from './Alert.module.scss';

export type { AlertProps, AlertVariant } from './Alert.types';

export const Alert = ({ variant = 'info', title, children, className }: AlertProps) => (
  <div
    className={clsx(styles.alert, styles[variant], className)}
    role={variant === 'error' ? 'alert' : 'status'}
  >
    {title ? <p className={styles.title}>{title}</p> : null}
    <div className={styles.body}>{children}</div>
  </div>
);
