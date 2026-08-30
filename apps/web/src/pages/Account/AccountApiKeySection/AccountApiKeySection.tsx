import { useState } from 'react';
import { reissueApiKeyRequest } from '@/api/api-keys';
import { ApiRequestError, NetworkError } from '@/api/http';
import { useAuthStore } from '@/app/authStore';
import { Button } from '@/components/Button/Button';
import { Modal } from '@/components/Modal/Modal';
import { copyToClipboard } from '@/lib/copyToClipboard';
import { maskApiKey } from '@/lib/maskApiKey';
import type { AccountApiKeySectionProps } from './AccountApiKeySection.types';
import styles from './AccountApiKeySection.module.scss';

const FALLBACK_MASKED_KEY = maskApiKey('cv_live_');

const isPlaintextKey = (key: string | undefined): key is string =>
  Boolean(key) && !key.includes('•');

export const AccountApiKeySection = ({
  onNotify,
  apiKey: apiKeyProp,
  initiallyVisible = false,
  hideIfUnknown = false,
}: AccountApiKeySectionProps) => {
  const rememberIssuedApiKey = useAuthStore((state) => state.rememberIssuedApiKey);
  const plaintextKey = isPlaintextKey(apiKeyProp) ? apiKeyProp : null;
  const [isKeyVisible, setIsKeyVisible] = useState(initiallyVisible && Boolean(plaintextKey));
  const [isReissueModalOpen, setIsReissueModalOpen] = useState(false);
  const [isReissuing, setIsReissuing] = useState(false);
  const canRevealKey = Boolean(plaintextKey);
  const shouldShowKeyRow = canRevealKey || !hideIfUnknown;
  const displayedKey = isKeyVisible && plaintextKey ? plaintextKey : FALLBACK_MASKED_KEY;

  const handleToggleVisibility = () => {
    if (!plaintextKey) {
      return;
    }

    setIsKeyVisible((current) => !current);
  };

  const handleCopyKey = async () => {
    if (!plaintextKey) {
      return;
    }

    const copied = await copyToClipboard(plaintextKey);
    onNotify(copied ? 'Ключ скопирован' : 'Не удалось скопировать ключ');
  };

  const handleOpenReissueModal = () => {
    setIsReissueModalOpen(true);
  };

  const handleCloseReissueModal = () => {
    setIsReissueModalOpen(false);
  };

  const handleReissueKey = () => {
    setIsReissueModalOpen(false);
    void (async () => {
      setIsReissuing(true);

      try {
        const issued = await reissueApiKeyRequest();
        rememberIssuedApiKey(issued.api_key);
        setIsKeyVisible(true);
        onNotify('Ключ обновлён. Сохраните его.');
      } catch (error) {
        if (error instanceof ApiRequestError || error instanceof NetworkError) {
          onNotify(error.userMessage);
          return;
        }

        onNotify('Не удалось перевыпустить ключ.');
      } finally {
        setIsReissuing(false);
      }
    })();
  };

  return (
    <section className={styles.card} aria-labelledby="api-key-title">
      <h2 id="api-key-title" className={styles.sectionTitle}>
        API-ключ
      </h2>
      {shouldShowKeyRow && (
        <div className={styles.keyRow}>
          <p className={styles.keyLabel} id="api-key-value-label">
            Ключ
          </p>
          <code className={styles.keyValue} translate="no" aria-labelledby="api-key-value-label">
            {displayedKey}
          </code>
        </div>
      )}
      <div className={styles.actions}>
        {canRevealKey && (
          <>
            <Button
              variant="secondary"
              className={styles.toggle}
              aria-pressed={isKeyVisible}
              aria-label={isKeyVisible ? 'Скрыть API-ключ' : 'Показать API-ключ'}
              onClick={handleToggleVisibility}
            >
              {isKeyVisible ? 'Скрыть' : 'Показать'}
            </Button>
            <Button variant="secondary" onClick={() => void handleCopyKey()}>
              Скопировать
            </Button>
          </>
        )}
        <Button variant="danger" onClick={handleOpenReissueModal} disabled={isReissuing}>
          Перевыпустить
        </Button>
      </div>

      <Modal
        open={isReissueModalOpen}
        title="Перевыпустить API-ключ?"
        onClose={handleCloseReissueModal}
        confirmLabel="Перевыпустить"
        cancelLabel="Отмена"
        danger
        onConfirm={handleReissueKey}
      >
        Старый ключ перестанет работать сразу. Новый ключ можно смотреть и скрывать в любой момент.
      </Modal>
    </section>
  );
};
