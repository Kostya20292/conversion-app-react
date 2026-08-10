import clsx from 'clsx';
import { useEffect, useState } from 'react';
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
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    setVisible(open);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      setVisible(false);
      onClose();
    }, durationMs);

    return () => window.clearTimeout(timer);
  }, [open, durationMs, onClose, message]);

  if (!visible) return null;

  const handleClose = () => {
    setVisible(false);
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
