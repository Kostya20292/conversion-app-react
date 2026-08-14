import { useEffect, useId, useRef } from 'react';
import { Button } from '@/components/Button/Button';
import type { ModalProps } from './Modal.types';
import styles from './Modal.module.scss';

const supportsClosedBy =
  typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;

export const Modal = ({
  open,
  title,
  children,
  onClose,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  onConfirm,
  danger = false,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const skipCloseCallbackRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      skipCloseCallbackRef.current = true;
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || supportsClosedBy) return;

    const handleClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;

      const rect = dialog.getBoundingClientRect();
      const isInsideContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (isInsideContent) return;
      dialog.close();
    };

    dialog.addEventListener('click', handleClick);
    return () => dialog.removeEventListener('click', handleClick);
  }, []);

  const requestClose = () => {
    dialogRef.current?.close();
  };

  const handleDialogClose = () => {
    if (skipCloseCallbackRef.current) {
      skipCloseCallbackRef.current = false;
      return;
    }

    onClose();
  };

  const handleConfirm = () => {
    onConfirm?.();
    requestClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      {...(supportsClosedBy ? { closedby: 'any' as const } : {})}
      onClose={handleDialogClose}
    >
      <div className={styles.panel}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div className={styles.body}>{children}</div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={requestClose}>
            {cancelLabel}
          </Button>
          {onConfirm && (
            <Button variant={danger ? 'danger' : 'primary'} onClick={handleConfirm}>
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </dialog>
  );
};
