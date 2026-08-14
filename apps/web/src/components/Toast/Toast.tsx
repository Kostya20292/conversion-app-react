import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import type { ToastProps } from './Toast.types';
import styles from './Toast.module.scss';

export const Toast = ({
  message,
  variant = 'info',
  open,
  onClose,
  durationMs = 5000,
}: ToastProps) => {
  const toastRef = useRef<HTMLDivElement>(null);
  const isError = variant === 'error';

  useEffect(() => {
    if (!open) return;

    const node = toastRef.current;
    let timer = window.setTimeout(() => {
      onClose();
    }, durationMs);

    const handlePause = () => {
      window.clearTimeout(timer);
    };

    const handleResume = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        onClose();
      }, durationMs);
    };

    node?.addEventListener('mouseenter', handlePause);
    node?.addEventListener('mouseleave', handleResume);
    node?.addEventListener('focusin', handlePause);
    node?.addEventListener('focusout', handleResume);

    return () => {
      window.clearTimeout(timer);
      node?.removeEventListener('mouseenter', handlePause);
      node?.removeEventListener('mouseleave', handleResume);
      node?.removeEventListener('focusin', handlePause);
      node?.removeEventListener('focusout', handleResume);
    };
  }, [open, durationMs, onClose, message]);

  if (!open) return null;

  const handleClose = () => {
    onClose();
  };

  return (
    <div
      ref={toastRef}
      className={clsx(styles.toast, styles[variant])}
      role={isError ? 'alert' : 'status'}
    >
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
