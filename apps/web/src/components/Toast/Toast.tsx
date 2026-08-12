import clsx from 'clsx';
import { useEffect } from 'react';
import type { ToastProps } from './Toast.types';
import styles from './Toast.module.scss';

export type { ToastProps, ToastVariant } from './Toast.types';

export const Toast = ({
  message,
  variant = 'info',
  open,
  onClose,
  durationMs = 5000,
}: ToastProps) => {
  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      onClose();
    }, durationMs);

    return () => window.clearTimeout(timer);
  }, [open, durationMs, onClose, message]);

  if (!open) return null;

  const handleClose = () => {
    onClose();
  };

  return (
    <div className={clsx(styles.toast, styles[variant])} role="status" aria-live="polite">
      <p className={styles.message}>{message}</p>
      <button
        type="button"
        className={styles.close}
        onClick={handleClose}
        aria-label="Закрыть уведомление"
      >
        ×
      </button>
    </div>
  );
};
