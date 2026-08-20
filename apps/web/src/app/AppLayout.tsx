import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/app/authStore';
import { Footer } from '@/components/Footer/Footer';
import { Header } from '@/components/Header/Header';
import { getDocumentTitle } from '@/lib/getDocumentTitle';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import styles from './AppLayout.module.scss';

export const AppLayout = () => {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'authenticated';

  useDocumentTitle(getDocumentTitle(location.pathname));

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    mainRef.current?.focus();
  }, [location.pathname]);

  return (
    <div className={styles.shell}>
      <a href="#content" className={styles.skipLink}>
        Перейти к содержимому
      </a>
      <Header isAuthenticated={isAuthenticated} />
      <main id="content" ref={mainRef} className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
