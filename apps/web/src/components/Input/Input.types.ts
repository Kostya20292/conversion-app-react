import type { InputHTMLAttributes, Ref } from 'react';

export type InputProps = {
  label: string;
  error?: string;
  hint?: string;
  id: string;
  ref?: Ref<HTMLInputElement>;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>;
