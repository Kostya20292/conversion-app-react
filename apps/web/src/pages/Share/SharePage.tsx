import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiRequestError, NetworkError } from '@/api/http';
import { getPublicShareRequest, toShareFileMeta } from '@/api/shares';
import { Alert } from '@/components/Alert/Alert';
import { Button } from '@/components/Button/Button';
import { Spinner } from '@/components/Spinner/Spinner';
import { isAvailableSharePreview, isUnavailableSharePreview } from '@/constants/share';
import { getDocumentTitle } from '@/lib/getDocumentTitle';
import { triggerBrowserDownload } from '@/lib/triggerBrowserDownload';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import type { ShareFileMeta } from '@/types/share';
import { ShareAvailableCard } from './ShareAvailableCard/ShareAvailableCard';
import { ShareUnavailableCard } from './ShareUnavailableCard/ShareUnavailableCard';
import styles from './SharePage.module.scss';

const PREVIEW_SHARE_FILE: ShareFileMeta = {
  name: 'presentation.png',
  format: 'PNG',
  sizeBytes: 1_048_576,
  expiresAt: '2026-08-20T15:00:00.000Z',
};

const UNAVAILABLE_TITLE = 'Ссылка недоступна — Convertly';

type SharePageView =
  | { status: 'loading' }
  | { status: 'available'; file: ShareFileMeta; downloadUrl: string | null }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

const initialView = (token: string | undefined): SharePageView => {
  if (isUnavailableSharePreview(token)) {
    return { status: 'unavailable' };
  }

  if (isAvailableSharePreview(token)) {
    return { status: 'available', file: PREVIEW_SHARE_FILE, downloadUrl: null };
  }

  return { status: 'loading' };
};

export const SharePage = () => {
  const { token } = useParams();
  const [retryCount, setRetryCount] = useState(0);
  const [viewToken, setViewToken] = useState(token);
  const [view, setView] = useState<SharePageView>(() => initialView(token));
  const skipFetch = isUnavailableSharePreview(token) || isAvailableSharePreview(token);

  if (token !== viewToken) {
    setViewToken(token);
    setView(initialView(token));
  }

  const pageTitle =
    view.status === 'unavailable' ? UNAVAILABLE_TITLE : getDocumentTitle(`/s/${token ?? ''}`);
  useDocumentTitle(pageTitle);

  useEffect(() => {
    if (!token || skipFetch) {
      return;
    }

    const controller = new AbortController();

    const loadShare = async () => {
      try {
        const dto = await getPublicShareRequest(token, { signal: controller.signal });
        setView({
          status: 'available',
          file: toShareFileMeta(dto),
          downloadUrl: dto.download_url,
        });
      } catch (caught) {
        if (caught instanceof Error && caught.name === 'AbortError') {
          return;
        }

        if (
          caught instanceof ApiRequestError &&
          (caught.code === 'gone' || caught.code === 'not_found')
        ) {
          setView({ status: 'unavailable' });
          return;
        }

        if (caught instanceof NetworkError || caught instanceof ApiRequestError) {
          setView({ status: 'error', message: caught.userMessage });
          return;
        }

        throw caught;
      }
    };

    void loadShare();

    return () => {
      controller.abort();
    };
  }, [token, skipFetch, retryCount]);

  const handleDownload = () => {
    if (view.status !== 'available' || !view.downloadUrl) {
      return;
    }

    triggerBrowserDownload(view.downloadUrl);
  };

  const handleRetry = () => {
    setView({ status: 'loading' });
    setRetryCount((current) => current + 1);
  };

  return (
    <div className="container narrowPage">
      {view.status === 'loading' && (
        <div className={styles.state}>
          <Spinner label="Загрузка файла" />
        </div>
      )}
      {view.status === 'unavailable' && <ShareUnavailableCard />}
      {view.status === 'available' && (
        <ShareAvailableCard file={view.file} onDownload={handleDownload} />
      )}
      {view.status === 'error' && (
        <div className={styles.state}>
          <Alert variant="error" live>
            {view.message}
          </Alert>
          <Button className={styles.retry} onClick={handleRetry}>
            Повторить
          </Button>
        </div>
      )}
    </div>
  );
};
