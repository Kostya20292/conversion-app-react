import type { InputHTMLAttributes } from 'react';

export type CheckboxProps = {
  label: string;
  id: string;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'>;
