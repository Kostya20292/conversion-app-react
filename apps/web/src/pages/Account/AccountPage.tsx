import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '@/components/Alert/Alert';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { Modal } from '@/components/Modal/Modal';
import { Toggle } from '@/components/Toggle/Toggle';
import styles from './AccountPage.module.scss';

export const AccountPage = () => {
  const [saveConversions, setSaveConversions] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  const handleOpenKeyModal = () => {
    setIsKeyModalOpen(true);
  };

  const handleCloseKeyModal = () => {
    setIsKeyModalOpen(false);
  };

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Личный кабинет</h1>
      <p className={styles.lead}>Профиль, API-ключ и сохранённые файлы.</p>

      <Alert variant="info" className={styles.notice}>
        Страница пока без авторизации. Guard и данные с API появятся на этапе B.
      </Alert>

      <section className={styles.card} aria-labelledby="profile-title">
        <h2 id="profile-title" className={styles.sectionTitle}>
          Профиль
        </h2>
        <div className={styles.form}>
          <Input id="account-name" label="Имя" defaultValue="" />
          <Input id="account-email" label="Email" type="email" defaultValue="" />
          <Input
            id="account-password"
            label="Новый пароль"
            type="password"
            autoComplete="new-password"
          />
          <Button variant="secondary">Сохранить профиль</Button>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="api-key-title">
        <h2 id="api-key-title" className={styles.sectionTitle}>
          API-ключ
        </h2>
        <p className={styles.meta}>Ключ: cv_live_••••••••••••</p>
        <div className={styles.actions}>
          <Button variant="secondary">Скопировать</Button>
          <Button variant="danger" onClick={handleOpenKeyModal}>
            Перевыпустить
          </Button>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="save-title">
        <h2 id="save-title" className={styles.srOnly}>
          Сохранение конвертаций
        </h2>
        <Toggle
          id="save-conversions"
          label="Сохранять конвертации в профиле"
          description="Выключение не удаляет уже сохранённые файлы"
          checked={saveConversions}
          onChange={(event) => setSaveConversions(event.target.checked)}
        />
      </section>

      <section className={styles.card} aria-labelledby="files-title">
        <h2 id="files-title" className={styles.sectionTitle}>
          Сохранённые файлы
        </h2>
        <p className={styles.empty}>Пока нет сохранённых файлов. Сконвертируйте файл на главной.</p>
      </section>

      <section className={styles.card} aria-labelledby="shares-title">
        <h2 id="shares-title" className={styles.sectionTitle}>
          Активные ссылки
        </h2>
        <p className={styles.empty}>Активных share-ссылок нет.</p>
      </section>

      <div className={styles.footerActions}>
        <Button variant="tertiary">Выйти</Button>
        <Link to="/" className={styles.link}>
          На главную
        </Link>
      </div>

      <Modal
        open={isKeyModalOpen}
        title="Перевыпустить API-ключ?"
        onClose={handleCloseKeyModal}
        confirmLabel="Перевыпустить"
        cancelLabel="Отмена"
        danger
        onConfirm={handleCloseKeyModal}
      >
        Старый ключ перестанет работать сразу. Новый ключ будет показан один раз.
      </Modal>
    </div>
  );
};
