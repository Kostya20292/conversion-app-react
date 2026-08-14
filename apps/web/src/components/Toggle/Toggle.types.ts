import type { InputHTMLAttributes } from 'react';

export type ToggleProps = {
  label: string;
  id: string;
  description?: string;
  checked: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type' | 'checked' | 'defaultChecked'>;
