export type ToastVariant = 'info' | 'success' | 'error';

export type ToastProps = {
  message: string;
  variant?: ToastVariant;
  open: boolean;
  onClose: () => void;
  durationMs?: number;
};
