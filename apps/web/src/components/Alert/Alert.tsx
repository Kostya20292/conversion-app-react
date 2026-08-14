import { useId } from 'react';
import clsx from 'clsx';
import type { AlertProps } from './Alert.types';
import styles from './Alert.module.scss';

export const Alert = ({
  variant = 'info',
  title,
  children,
  className,
  live = false,
}: AlertProps) => {
  const titleId = useId();

  return (
    <div
      className={clsx(styles.alert, styles[variant], className)}
      role={live ? (variant === 'error' ? 'alert' : 'status') : undefined}
      aria-labelledby={title ? titleId : undefined}
    >
      {title && (
        <strong id={titleId} className={styles.title}>
          {title}
        </strong>
      )}
      <div className={styles.body}>{children}</div>
    </div>
  );
};
