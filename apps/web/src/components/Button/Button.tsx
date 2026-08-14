import clsx from 'clsx';
import type { ButtonProps } from './Button.types';
import styles from './Button.module.scss';

export const Button = ({
  variant = 'primary',
  children,
  fullWidth = false,
  className,
  type = 'button',
  disabled,
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    className={clsx(styles.button, styles[variant], fullWidth && styles.fullWidth, className)}
    disabled={disabled}
    {...rest}
  >
    {children}
  </button>
);
