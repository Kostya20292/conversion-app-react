import type { InputHTMLAttributes, ReactNode } from 'react';

export type InputProps = {
  label: string;
  error?: string;
  hint?: string;
  id: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>;

export type FieldErrorProps = {
  id?: string;
  children: ReactNode;
};
