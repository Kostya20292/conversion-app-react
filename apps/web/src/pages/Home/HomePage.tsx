import { useState, type SubmitEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiRequestError, NetworkError, apiDownload } from '@/api/http';
import { useAuthStore } from '@/app/authStore';
import { Banner } from '@/components/Banner/Banner';
import { Button } from '@/components/Button/Button';
import { Dropzone } from '@/components/Dropzone/Dropzone';
import { JobStatus } from '@/components/JobStatus/JobStatus';
import { SegmentedControl } from '@/components/SegmentedControl/SegmentedControl';
import { Toast } from '@/components/Toast/Toast';
import { CONVERSION_ROUTE_OPTIONS } from '@/constants/conversion';
import { useConversionStore } from '@/features/conversion/conversionStore';
import { copyToClipboard } from '@/lib/copyToClipboard';
import { toAbsoluteUrl } from '@/lib/toAbsoluteUrl';
import type { ConversionRoute } from '@/types/conversion';
import styles from './HomePage.module.scss';

export const HomePage = () => {
  const route = useConversionStore((state) => state.route);
  const file = useConversionStore((state) => state.file);
  const error = useConversionStore((state) => state.error);
  const phase = useConversionStore((state) => state.phase);
  const job = useConversionStore((state) => state.job);
  const setRoute = useConversionStore((state) => state.setRoute);
  const selectFiles = useConversionStore((state) => state.selectFiles);
  const clearFile = useConversionStore((state) => state.clearFile);
  const startConversion = useConversionStore((state) => state.startConversion);
  const createShare = useConversionStore((state) => state.createShare);
  const retryConversion = useConversionStore((state) => state.retryConversion);
  const shareUrl = useConversionStore((state) => state.shareUrl);
  const shareError = useConversionStore((state) => state.shareError);
  const isSharing = useConversionStore((state) => state.isSharing);
  const isBusy = phase === 'uploading' || phase === 'processing';
  const canConvert = Boolean(file) && !error && phase === 'idle';
  const dropzoneError = phase === 'failed' ? null : error;
  const isAuthenticated = useAuthStore((state) => state.status) === 'authenticated';
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleRouteChange = (nextRoute: ConversionRoute) => {
    setDownloadError(null);
    setRoute(nextRoute);
  };

  const handleSelectFiles = (files: File[]) => {
    setDownloadError(null);
    selectFiles(files);
  };

  const handleClearFile = () => {
    setDownloadError(null);
    clearFile();
  };

  const handleConvert = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDownloadError(null);
    void startConversion();
  };

  const handleDownload = () => {
    const downloadUrl = job?.download_url;
    if (!downloadUrl) {
      return;
    }

    void (async () => {
      try {
        await apiDownload(downloadUrl, {
          errorContext: 'download',
          notify: { network: false },
        });
        setDownloadError(null);
      } catch (error) {
        if (error instanceof ApiRequestError && error.code === 'internal_error') {
          return;
        }

        if (error instanceof ApiRequestError || error instanceof NetworkError) {
          setDownloadError(error.userMessage);
          return;
        }

        setDownloadError('Файл больше недоступен (истёк срок хранения)');
      }
    })();
  };

  const handleShare = () => {
    void (async () => {
      await createShare();
      const url = useConversionStore.getState().shareUrl;
      if (!url) {
        return;
      }

      const copied = await copyToClipboard(toAbsoluteUrl(url));
      setToastMessage(copied ? 'Ссылка скопирована' : 'Не удалось скопировать ссылку');
    })();
  };

  const handleCloseToast = () => {
    setToastMessage(null);
  };

  const handleRetry = () => {
    setDownloadError(null);
    retryConversion();
  };

  return (
    <div className={styles.page}>
      <section className={`container ${styles.hero}`} aria-labelledby="home-brand">
        <h1 className={styles.brand} id="home-brand">
          Convertly
        </h1>
        <p className={styles.subtitle}>Конвертируйте файлы онлайн и через API</p>

        <form className={styles.convertForm} onSubmit={handleConvert}>
          <div className={styles.controls}>
            <SegmentedControl
              ariaLabel="Направление конвертации"
              className={styles.routeControl}
              options={CONVERSION_ROUTE_OPTIONS}
              value={route}
              onChange={handleRouteChange}
            />
          </div>

          <div className={styles.upload}>
            <Dropzone
              file={file}
              error={dropzoneError}
              onFilesSelected={handleSelectFiles}
              onClear={handleClearFile}
            />
          </div>

          {phase !== 'completed' && phase !== 'failed' && (
            <Button type="submit" disabled={!canConvert || isBusy} className={styles.cta}>
              Конвертировать
            </Button>
          )}

          {phase !== 'idle' && (
            <JobStatus
              phase={phase}
              error={error}
              downloadError={downloadError}
              isSharing={isSharing}
              shareUrl={shareUrl}
              shareError={shareError}
              onDownload={handleDownload}
              onShare={handleShare}
              onRetry={handleRetry}
            />
          )}
        </form>
      </section>

      {!isAuthenticated && (
        <section className={`container ${styles.section}`}>
          <Banner
            action={
              <Link to="/login" className={styles.bannerLink} aria-label="Открыть страницу входа">
                Войти
              </Link>
            }
          >
            Войдите, чтобы сохранять файлы в профиле, управлять ссылками и пользоваться API.
          </Banner>
        </section>
      )}

      <section className={`container ${styles.section}`} aria-labelledby="how-title">
        <h2 id="how-title" className={styles.sectionTitle}>
          Как это работает
        </h2>
        <p className={styles.sectionLead}>Три шага до готового файла.</p>
        <ol className={styles.steps}>
          <li>
            <span className={styles.stepIndex}>1</span>
            <div>
              <p className={styles.stepTitle}>Загрузить</p>
              <p className={styles.stepText}>Выберите один файл нужного формата.</p>
            </div>
          </li>
          <li>
            <span className={styles.stepIndex}>2</span>
            <div>
              <p className={styles.stepTitle}>Конвертировать</p>
              <p className={styles.stepText}>Мы обработаем файл и покажем статус задачи.</p>
            </div>
          </li>
          <li>
            <span className={styles.stepIndex}>3</span>
            <div>
              <p className={styles.stepTitle}>Скачать / Поделиться</p>
              <p className={styles.stepText}>Скачайте результат или отправьте публичную ссылку.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="api-title">
        <h2 id="api-title" className={styles.sectionTitle}>
          API для разработчиков
        </h2>
        <p className={styles.sectionLead}>
          Конвертируйте файлы из своих сервисов по ключу. Документация с примерами curl и fetch.
        </p>
        <div className={styles.apiActions}>
          <Link to="/api-docs" className={styles.textLink} aria-label="Открыть документацию">
            Открыть API docs
          </Link>
          <Link to={isAuthenticated ? '/account' : '/register'} className={styles.textLink}>
            Получить ключ
          </Link>
        </div>
      </section>

      <Toast open={Boolean(toastMessage)} message={toastMessage ?? ''} onClose={handleCloseToast} />
    </div>
  );
};
