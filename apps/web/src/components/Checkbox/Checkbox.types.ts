import type { InputHTMLAttributes } from 'react';

type ExclusiveCheckedProps =
  { checked: boolean; defaultChecked?: never } | { checked?: never; defaultChecked?: boolean };

export type CheckboxProps = {
  label: string;
  id: string;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type' | 'checked' | 'defaultChecked'> &
  ExclusiveCheckedProps;
