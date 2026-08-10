import clsx from 'clsx';
import type { FieldErrorProps, InputProps } from './Input.types';
import styles from './Input.module.scss';

export type { FieldErrorProps, InputProps } from './Input.types';

export const Input = ({ label, error, hint, id, className, disabled, ...rest }: InputProps) => (
  <div className={clsx(styles.field, className)}>
    <label className={styles.label} htmlFor={id}>
      {label}
    </label>
    <input
      id={id}
      className={styles.input}
      disabled={disabled}
      aria-invalid={error ? true : undefined}
      aria-describedby={
        [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') ||
        undefined
      }
      {...rest}
    />
    {hint && !error ? (
      <p id={`${id}-hint`} className={styles.hint}>
        {hint}
      </p>
    ) : null}
    {error ? (
      <p id={`${id}-error`} className={styles.error} role="alert">
        {error}
      </p>
    ) : null}
  </div>
);

export const FieldError = ({ id, children }: FieldErrorProps) => (
  <p id={id} className={styles.error} role="alert">
    {children}
  </p>
);
