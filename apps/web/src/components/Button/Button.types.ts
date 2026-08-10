import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';

export type ButtonProps = {
  variant?: ButtonVariant;
  children: ReactNode;
  fullWidth?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;
