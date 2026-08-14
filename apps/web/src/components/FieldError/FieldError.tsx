import clsx from 'clsx';
import type { FieldErrorProps } from './FieldError.types';
import styles from './FieldError.module.scss';

export const FieldError = ({ id, className, children }: FieldErrorProps) => (
  <p id={id} className={clsx(styles.error, className)} role="alert">
    {children}
  </p>
);
