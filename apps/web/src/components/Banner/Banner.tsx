import clsx from 'clsx';
import type { BannerProps } from './Banner.types';
import styles from './Banner.module.scss';

export const Banner = ({ children, className, action, live = false }: BannerProps) => (
  <div className={clsx(styles.banner, className)} role={live ? 'status' : undefined}>
    <div className={styles.content}>{children}</div>
    {action && <div className={styles.action}>{action}</div>}
  </div>
);
