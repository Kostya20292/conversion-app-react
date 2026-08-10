import { Outlet } from 'react-router-dom';
import { Footer } from '@/app/Footer/Footer';
import { Header } from '@/app/Header/Header';
import styles from './AppLayout.module.scss';

export const AppLayout = () => (
  <div className={styles.shell}>
    <Header />
    <main className={styles.main}>
      <Outlet />
    </main>
    <Footer />
  </div>
);
