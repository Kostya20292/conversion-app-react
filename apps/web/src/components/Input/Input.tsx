import clsx from 'clsx';
import { FieldError } from '@/components/FieldError/FieldError';
import type { InputProps } from './Input.types';
import styles from './Input.module.scss';

export const Input = ({
  label,
  error,
  hint,
  id,
  className,
  disabled,
  ref,
  ...rest
}: InputProps) => {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={clsx(styles.field, className)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        className={styles.input}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {hintId && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
};
