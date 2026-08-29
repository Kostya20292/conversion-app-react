import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { setHttpErrorHandlers } from '@/api/http';
import { mapApiErrorCode } from '@/api/mapApiErrorCode';
import { Footer } from '@/components/Footer/Footer';
import { Header } from '@/components/Header/Header';
import { Modal } from '@/components/Modal/Modal';
import { Toast } from '@/components/Toast/Toast';
import { getDocumentTitle } from '@/lib/getDocumentTitle';
import { getSafeNextPath } from '@/lib/getSafeNextPath';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useAuthStore } from './authStore';
import styles from './AppLayout.module.scss';

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);
  const status = useAuthStore((state) => state.status);
  const clearSession = useAuthStore((state) => state.clearSession);
  const isAuthenticated = status === 'authenticated';
  const [sessionExpired, setSessionExpired] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useDocumentTitle(getDocumentTitle(location.pathname));

  useEffect(() => {
    const controller = new AbortController();
    void useAuthStore.getState().hydrateSession(controller.signal);

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    setHttpErrorHandlers({
      onSessionExpired: () => {
        if (useAuthStore.getState().status !== 'authenticated') {
          return;
        }

        clearSession();
        setSessionExpired(true);
      },
      onRateLimited: (retryAfterSeconds) => {
        setToastMessage(mapApiErrorCode({ code: 'rate_limited', retryAfterSeconds }));
      },
      onServerError: () => {
        setToastMessage(mapApiErrorCode({ code: 'internal_error' }));
      },
    });

    return () => {
      setHttpErrorHandlers({});
    };
  }, [clearSession]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    mainRef.current?.focus();
  }, [location.pathname]);

  const handleCloseToast = () => {
    setToastMessage(null);
  };

  const handleSessionLogin = () => {
    setSessionExpired(false);
    navigate(`/login?next=${getSafeNextPath(location.pathname, '/')}`, { replace: true });
  };

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
      <Modal
        open={sessionExpired}
        title="Сессия истекла"
        confirmLabel="Войти"
        cancelLabel="Закрыть"
        onConfirm={handleSessionLogin}
        onClose={handleSessionLogin}
      >
        Войдите снова, чтобы продолжить.
      </Modal>
      <Toast
        open={Boolean(toastMessage)}
        message={toastMessage ?? ''}
        variant="error"
        onClose={handleCloseToast}
      />
    </div>
  );
};
