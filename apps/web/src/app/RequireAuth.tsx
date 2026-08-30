import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@/components/Spinner/Spinner';
import { useAuthStore } from './authStore';
import styles from './RequireAuth.module.scss';

type RequireAuthProps = {
  children: ReactNode;
};

export const RequireAuth = ({ children }: RequireAuthProps) => {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  return (
    <>
      {status === 'loading' && (
        <div className={styles.pending}>
          <Spinner label="Проверяем сессию" />
        </div>
      )}
      {status === 'anonymous' && <Navigate to={`/login?next=${location.pathname}`} replace />}
      {status === 'authenticated' && children}
    </>
  );
};
