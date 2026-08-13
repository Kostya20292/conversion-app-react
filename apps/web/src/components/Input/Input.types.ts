import type { InputHTMLAttributes, ReactNode, Ref } from 'react';

export type InputProps = {
  label: string;
  error?: string;
  hint?: string;
  id: string;
  ref?: Ref<HTMLInputElement>;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>;

export type FieldErrorProps = {
  id?: string;
  children: ReactNode;
};
