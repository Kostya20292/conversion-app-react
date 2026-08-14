import type { ReactNode } from 'react';

export type BannerProps = {
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  live?: boolean;
};
