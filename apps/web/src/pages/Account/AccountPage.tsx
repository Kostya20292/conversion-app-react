import { useEffect, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteFileRequest, listFilesRequest } from '@/api/files';
import { ApiRequestError, NetworkError, apiDownload } from '@/api/http';
import { createShareRequest, listSharesRequest, revokeShareRequest } from '@/api/shares';
import { patchMeRequest } from '@/api/users';
import { useAuthStore } from '@/app/authStore';
import { Button } from '@/components/Button/Button';
import { Modal } from '@/components/Modal/Modal';
import { Toast } from '@/components/Toast/Toast';
import { Toggle } from '@/components/Toggle/Toggle';
import { copyToClipboard } from '@/lib/copyToClipboard';
import { toAbsoluteUrl } from '@/lib/toAbsoluteUrl';
import type { ShareLinkItem, StoredFile } from '@/types/account';
import { AccountApiKeySection } from './AccountApiKeySection/AccountApiKeySection';
import { AccountFileList } from './AccountFileList/AccountFileList';
import { AccountProfileSection } from './AccountProfileSection/AccountProfileSection';
import { AccountShareList } from './AccountShareList/AccountShareList';
import styles from './AccountPage.module.scss';

const isAbortError = (error: unknown): boolean =>
  (error instanceof DOMException && error.name === 'AbortError') ||
  (error instanceof Error && error.name === 'AbortError');

export const AccountPage = () => {
  const navigate = useNavigate();
  const issuedApiKey = useAuthStore((state) => state.issuedApiKey);
  const saveConversions = useAuthStore((state) => state.user?.saveConversions) ?? false;
  const applyUser = useAuthStore((state) => state.applyUser);
  const logout = useAuthStore((state) => state.logout);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [shares, setShares] = useState<ShareLinkItem[]>([]);
  const [filesNextCursor, setFilesNextCursor] = useState<string | null>(null);
  const [sharesNextCursor, setSharesNextCursor] = useState<string | null>(null);
  const [isLoadingMoreFiles, setIsLoadingMoreFiles] = useState(false);
  const [isLoadingMoreShares, setIsLoadingMoreShares] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<StoredFile | null>(null);
  const [shareToRevoke, setShareToRevoke] = useState<ShareLinkItem | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSavingToggle, setIsSavingToggle] = useState(false);
  const [saveConversionsOverride, setSaveConversionsOverride] = useState<boolean | null>(null);
  const saveConversionsChecked = saveConversionsOverride ?? saveConversions;

  const handleNotify = (message: string) => {
    setToastMessage(message);
  };

  const handleCloseToast = () => {
    setToastMessage(null);
  };

  const notifyCaught = (error: unknown, fallback: string) => {
    if (error instanceof NetworkError) {
      return;
    }

    if (error instanceof ApiRequestError && error.code === 'internal_error') {
      return;
    }

    if (error instanceof ApiRequestError || error instanceof NetworkError) {
      handleNotify(error.userMessage);
      return;
    }

    handleNotify(fallback);
  };

  useEffect(() => {
    const controller = new AbortController();

    const loadLists = async () => {
      try {
        const [filesPage, sharesPage] = await Promise.all([
          listFilesRequest({ signal: controller.signal }),
          listSharesRequest({ signal: controller.signal }),
        ]);
        setFiles(filesPage.files);
        setFilesNextCursor(filesPage.nextCursor);
        setShares(sharesPage.shares);
        setSharesNextCursor(sharesPage.nextCursor);
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        if (error instanceof NetworkError) {
          return;
        }

        if (error instanceof ApiRequestError && error.code === 'internal_error') {
          return;
        }

        if (error instanceof ApiRequestError || error instanceof NetworkError) {
          setToastMessage(error.userMessage);
          return;
        }

        setToastMessage('Не удалось загрузить файлы и ссылки.');
      }
    };

    void loadLists();

    return () => {
      controller.abort();
    };
  }, []);

  const handleDownloadFile = (file: StoredFile) => {
    void (async () => {
      try {
        await apiDownload(file.downloadUrl, {
          errorContext: 'download',
          notify: { sessionExpired: true, network: false },
        });
      } catch (error) {
        notifyCaught(error, 'Файл больше недоступен (истёк срок хранения)');
      }
    })();
  };

  const handleShareFile = (file: StoredFile) => {
    void (async () => {
      try {
        const created = await createShareRequest({ fileId: file.id });
        const sharesPage = await listSharesRequest();
        setShares(sharesPage.shares);
        setSharesNextCursor(sharesPage.nextCursor);
        const copied = await copyToClipboard(toAbsoluteUrl(created.url));
        handleNotify(copied ? 'Ссылка скопирована' : 'Не удалось скопировать ссылку');
      } catch (error) {
        notifyCaught(error, 'Не удалось создать ссылку. Попробуйте ещё раз.');
      }
    })();
  };

  const handleCopyShare = async (share: ShareLinkItem) => {
    const copied = await copyToClipboard(toAbsoluteUrl(share.url));
    handleNotify(copied ? 'Ссылка скопирована' : 'Не удалось скопировать ссылку');
  };

  const handleSaveConversionsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextChecked = event.target.checked;
    setSaveConversionsOverride(nextChecked);
    setIsSavingToggle(true);

    void (async () => {
      try {
        const user = await patchMeRequest({ saveConversions: nextChecked });
        applyUser(user);
        setSaveConversionsOverride(null);
      } catch (error) {
        setSaveConversionsOverride(null);
        notifyCaught(error, 'Не удалось сохранить настройку.');
      } finally {
        setIsSavingToggle(false);
      }
    })();
  };

  const handleLoadMoreFiles = () => {
    if (filesNextCursor === null || isLoadingMoreFiles) {
      return;
    }

    setIsLoadingMoreFiles(true);
    void (async () => {
      try {
        const page = await listFilesRequest({ cursor: filesNextCursor });
        setFiles((current) => [...current, ...page.files]);
        setFilesNextCursor(page.nextCursor);
      } catch (error) {
        notifyCaught(error, 'Не удалось загрузить файлы.');
      } finally {
        setIsLoadingMoreFiles(false);
      }
    })();
  };

  const handleLoadMoreShares = () => {
    if (sharesNextCursor === null || isLoadingMoreShares) {
      return;
    }

    setIsLoadingMoreShares(true);
    void (async () => {
      try {
        const page = await listSharesRequest({ cursor: sharesNextCursor });
        setShares((current) => [...current, ...page.shares]);
        setSharesNextCursor(page.nextCursor);
      } catch (error) {
        notifyCaught(error, 'Не удалось загрузить ссылки.');
      } finally {
        setIsLoadingMoreShares(false);
      }
    })();
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      notifyCaught(error, 'Не удалось выйти. Попробуйте ещё раз.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleConfirmDeleteFile = () => {
    const file = fileToDelete;
    setFileToDelete(null);
    if (!file) {
      return;
    }

    void (async () => {
      try {
        await deleteFileRequest(file.id);
        setFiles((current) => current.filter((item) => item.id !== file.id));
        const sharesPage = await listSharesRequest();
        setShares(sharesPage.shares);
        setSharesNextCursor(sharesPage.nextCursor);
        handleNotify('Файл удалён');
      } catch (error) {
        notifyCaught(error, 'Не удалось удалить файл. Попробуйте ещё раз.');
      }
    })();
  };

  const handleConfirmRevokeShare = () => {
    const share = shareToRevoke;
    setShareToRevoke(null);
    if (!share) {
      return;
    }

    void (async () => {
      try {
        await revokeShareRequest(share.token);
        setShares((current) => current.filter((item) => item.id !== share.id));
        handleNotify('Ссылка отозвана');
      } catch (error) {
        notifyCaught(error, 'Не удалось отозвать ссылку. Попробуйте ещё раз.');
      }
    })();
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
              disabled={isSavingToggle}
              onChange={handleSaveConversionsChange}
            />
          </section>
        </div>

        <div className={styles.lists}>
          <AccountFileList
            files={files}
            hasMore={filesNextCursor !== null}
            isLoadingMore={isLoadingMoreFiles}
            onDownload={handleDownloadFile}
            onShare={handleShareFile}
            onDelete={setFileToDelete}
            onLoadMore={handleLoadMoreFiles}
          />
          <AccountShareList
            shares={shares}
            hasMore={sharesNextCursor !== null}
            isLoadingMore={isLoadingMoreShares}
            onCopy={(share) => void handleCopyShare(share)}
            onRevoke={setShareToRevoke}
            onLoadMore={handleLoadMoreShares}
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
