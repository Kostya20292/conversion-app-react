import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Footer } from '@/app/Footer/Footer';
import { Header } from '@/app/Header/Header';
import { getDocumentTitle } from '@/lib/getDocumentTitle';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import styles from './AppLayout.module.scss';

export const AppLayout = () => {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

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
      <Header />
      <main id="content" ref={mainRef} className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
