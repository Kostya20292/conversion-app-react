import clsx from 'clsx';
import type { ToggleProps } from './Toggle.types';
import styles from './Toggle.module.scss';

export const Toggle = ({
  label,
  id,
  description,
  className,
  disabled,
  checked,
  ...rest
}: ToggleProps) => (
  <div className={clsx(styles.wrapper, className)}>
    <label className={styles.label} htmlFor={id}>
      <span className={styles.copy}>
        <span className={styles.title}>{label}</span>
        {description && (
          <span id={`${id}-description`} className={styles.description}>
            {description}
          </span>
        )}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className={styles.input}
        disabled={disabled}
        {...rest}
        checked={checked}
        aria-checked={checked}
        aria-describedby={description ? `${id}-description` : undefined}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
    </label>
  </div>
);
