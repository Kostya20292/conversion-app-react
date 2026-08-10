import type { ReactNode } from 'react';

export type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  danger?: boolean;
};
