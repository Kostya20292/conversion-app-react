import type { ReactNode } from 'react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export type AlertProps = {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
};
