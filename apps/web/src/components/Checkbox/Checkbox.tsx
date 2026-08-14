import clsx from 'clsx';
import { FieldError } from '@/components/FieldError/FieldError';
import type { CheckboxProps } from './Checkbox.types';
import styles from './Checkbox.module.scss';

export const Checkbox = ({ label, id, error, className, disabled, ...rest }: CheckboxProps) => (
  <div className={clsx(styles.wrapper, className)}>
    <label className={styles.label} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className={styles.input}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
      <span className={styles.box} aria-hidden="true" />
      <span className={styles.text}>{label}</span>
    </label>
    {error && (
      <FieldError id={`${id}-error`} className={styles.error}>
        {error}
      </FieldError>
    )}
  </div>
);
