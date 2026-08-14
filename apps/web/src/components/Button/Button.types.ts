import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';

export type ButtonAppearance = {
  variant?: ButtonVariant;
  children: ReactNode;
  fullWidth?: boolean;
};

export type ButtonProps = ButtonAppearance & ButtonHTMLAttributes<HTMLButtonElement>;
