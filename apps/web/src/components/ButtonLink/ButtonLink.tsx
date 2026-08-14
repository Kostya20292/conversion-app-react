import clsx from 'clsx';
import { Link } from 'react-router-dom';
import styles from '@/components/Button/Button.module.scss';
import type { ButtonLinkProps } from './ButtonLink.types';

export const ButtonLink = ({
  variant = 'primary',
  children,
  fullWidth = false,
  className,
  ...rest
}: ButtonLinkProps) => (
  <Link
    className={clsx(styles.button, styles[variant], fullWidth && styles.fullWidth, className)}
    {...rest}
  >
    {children}
  </Link>
);
