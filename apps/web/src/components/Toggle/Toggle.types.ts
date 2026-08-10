import type { InputHTMLAttributes } from 'react';

export type ToggleProps = {
  label: string;
  id: string;
  description?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'>;
