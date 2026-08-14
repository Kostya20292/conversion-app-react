import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Toast } from '@/components/Toast/Toast';
import { isUnavailableSharePreview } from '@/constants/share';
import type { ShareFileMeta } from '@/types/share';
import { ShareAvailableCard } from './ShareAvailableCard/ShareAvailableCard';
import { ShareUnavailableCard } from './ShareUnavailableCard/ShareUnavailableCard';

const PREVIEW_SHARE_FILE: ShareFileMeta = {
  name: 'presentation.png',
  format: 'PNG',
  sizeBytes: 1_048_576,
  expiresAt: '2026-08-20T15:00:00.000Z',
};

export const SharePage = () => {
  const { token } = useParams();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isUnavailable = isUnavailableSharePreview(token);

  const handleDownload = () => {
    setToastMessage('Скачивание подключится на следующем этапе.');
  };

  const handleCloseToast = () => {
    setToastMessage(null);
  };

  return (
    <div className="container narrowPage">
      {isUnavailable ? (
        <ShareUnavailableCard />
      ) : (
        <ShareAvailableCard file={PREVIEW_SHARE_FILE} onDownload={handleDownload} />
      )}
      <Toast open={Boolean(toastMessage)} message={toastMessage ?? ''} onClose={handleCloseToast} />
    </div>
  );
};
