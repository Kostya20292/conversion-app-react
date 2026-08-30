import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiRequestError, NetworkError } from '@/api/http';
import { useAuthStore } from '@/app/authStore';
import { Button } from '@/components/Button/Button';
import { Modal } from '@/components/Modal/Modal';
import { Toast } from '@/components/Toast/Toast';
import { Toggle } from '@/components/Toggle/Toggle';
import { copyToClipboard } from '@/lib/copyToClipboard';
import type { ShareLinkItem, StoredFile } from '@/types/account';
import { AccountApiKeySection } from './AccountApiKeySection/AccountApiKeySection';
import { AccountFileList } from './AccountFileList/AccountFileList';
import { AccountProfileSection } from './AccountProfileSection/AccountProfileSection';
import { AccountShareList } from './AccountShareList/AccountShareList';
import styles from './AccountPage.module.scss';

const EMPTY_FILES: StoredFile[] = [];

export const AccountPage = () => {
  const navigate = useNavigate();
  const issuedApiKey = useAuthStore((state) => state.issuedApiKey);
  const saveConversions = useAuthStore((state) => state.user?.saveConversions) ?? false;
  const logout = useAuthStore((state) => state.logout);
  const [shares, setShares] = useState<ShareLinkItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<StoredFile | null>(null);
  const [shareToRevoke, setShareToRevoke] = useState<ShareLinkItem | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [saveConversionsOverride, setSaveConversionsOverride] = useState<boolean | null>(null);
  const saveConversionsChecked = saveConversionsOverride ?? saveConversions;

  const handleNotify = (message: string) => {
    setToastMessage(message);
  };

  const handleCloseToast = () => {
    setToastMessage(null);
  };

  const handleDownloadFile = (_file: StoredFile) => {
    handleNotify('Скачивание подключится на следующем этапе.');
  };

  const handleShareFile = (_file: StoredFile) => {
    handleNotify('Создание ссылки подключится на следующем этапе.');
  };

  const handleCopyShare = async (share: ShareLinkItem) => {
    const copied = await copyToClipboard(share.url);
    handleNotify(copied ? 'Ссылка скопирована' : 'Не удалось скопировать ссылку');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'internal_error') {
        return;
      }

      if (error instanceof ApiRequestError || error instanceof NetworkError) {
        handleNotify(error.userMessage);
        return;
      }

      handleNotify('Не удалось выйти. Попробуйте ещё раз.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleConfirmDeleteFile = () => {
    handleNotify('Удаление файла подключится на следующем этапе.');
    setFileToDelete(null);
  };

  const handleConfirmRevokeShare = () => {
    if (shareToRevoke) {
      setShares((current) => current.filter((item) => item.id !== shareToRevoke.id));
    }
    handleNotify('Отзыв ссылки подключится на следующем этапе.');
    setShareToRevoke(null);
  };

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Личный кабинет</h1>
      <p className={styles.lead}>Профиль, API-ключ и сохранённые файлы.</p>

      <div className={styles.layout}>
        <div className={styles.settings}>
          <AccountProfileSection onNotify={handleNotify} />
          <AccountApiKeySection
            onNotify={handleNotify}
            apiKey={issuedApiKey ?? undefined}
            hideIfUnknown
          />
          <section className={styles.card} aria-labelledby="save-title">
            <h2 id="save-title" className={styles.srOnly}>
              Сохранение конвертаций
            </h2>
            <Toggle
              id="save-conversions"
              label="Сохранять конвертации в профиле"
              description="Выключение не удаляет уже сохранённые файлы"
              checked={saveConversionsChecked}
              onChange={(event) => setSaveConversionsOverride(event.target.checked)}
            />
          </section>
        </div>

        <div className={styles.lists}>
          <AccountFileList
            files={EMPTY_FILES}
            onDownload={handleDownloadFile}
            onShare={handleShareFile}
            onDelete={setFileToDelete}
          />
          <AccountShareList
            shares={shares}
            onCopy={(share) => void handleCopyShare(share)}
            onRevoke={setShareToRevoke}
          />
        </div>
      </div>

      <div className={styles.footerActions}>
        <Button
          variant="tertiary"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          aria-busy={isLoggingOut}
        >
          Выйти
        </Button>
        <Link to="/" className={styles.link}>
          На главную
        </Link>
      </div>

      <Modal
        open={Boolean(fileToDelete)}
        title="Удалить файл?"
        onClose={() => setFileToDelete(null)}
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        danger
        onConfirm={handleConfirmDeleteFile}
      >
        Файл исчезнет из списка в профиле. Это действие нельзя отменить.
      </Modal>

      <Modal
        open={Boolean(shareToRevoke)}
        title="Отозвать ссылку?"
        onClose={() => setShareToRevoke(null)}
        confirmLabel="Отозвать"
        cancelLabel="Отмена"
        danger
        onConfirm={handleConfirmRevokeShare}
      >
        Ссылка сразу перестанет открываться. Страница по ней покажет, что доступ недоступен.
      </Modal>

      <Toast open={Boolean(toastMessage)} message={toastMessage ?? ''} onClose={handleCloseToast} />
    </div>
  );
};
