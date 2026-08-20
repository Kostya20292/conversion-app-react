import { NavLink } from 'react-router-dom';
import type { HeaderProps } from './Header.types';
import styles from './Header.module.scss';

export const Header = ({ isAuthenticated }: HeaderProps) => (
  <header className={styles.header}>
    <div className={`container ${styles.inner}`}>
      <NavLink to="/" className={styles.logo} aria-label="Convertly — на главную">
        Convertly
      </NavLink>

      <nav className={styles.nav} aria-label="Основная навигация">
        <NavLink
          to="/"
          className={({ isActive }) =>
            [styles.link, isActive ? styles.active : ''].filter(Boolean).join(' ')
          }
          end
        >
          Конвертация
        </NavLink>
        <NavLink
          to="/api-docs"
          className={({ isActive }) =>
            [styles.link, isActive ? styles.active : ''].filter(Boolean).join(' ')
          }
        >
          API
        </NavLink>
        {isAuthenticated ? (
          <NavLink
            to="/account"
            className={({ isActive }) =>
              [styles.link, styles.ctaLink, isActive ? styles.active : ''].filter(Boolean).join(' ')
            }
          >
            ЛК
          </NavLink>
        ) : (
          <NavLink
            to="/login"
            className={({ isActive }) =>
              [styles.link, styles.ctaLink, isActive ? styles.active : ''].filter(Boolean).join(' ')
            }
          >
            Войти
          </NavLink>
        )}
      </nav>
    </div>
  </header>
);
