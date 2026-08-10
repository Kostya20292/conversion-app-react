import clsx from 'clsx';
import type { BannerProps } from './Banner.types';
import styles from './Banner.module.scss';

export type { BannerProps } from './Banner.types';

export const Banner = ({ children, className, action }: BannerProps) => (
  <div className={clsx(styles.banner, className)} role="status">
    <div className={styles.content}>{children}</div>
    {action ? <div className={styles.action}>{action}</div> : null}
  </div>
);
