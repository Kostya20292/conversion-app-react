import { useState } from 'react';
import { Button } from '@/components/Button/Button';
import { Modal } from '@/components/Modal/Modal';
import { copyToClipboard } from '@/lib/copyToClipboard';
import { maskApiKey } from '@/lib/maskApiKey';
import type { AccountApiKeySectionProps } from './AccountApiKeySection.types';
import styles from './AccountApiKeySection.module.scss';

const INITIAL_PLACEHOLDER_KEY = 'cv_live_placeholder_not_secret';

const createPlaceholderApiKey = (): string => {
  const suffix = crypto.randomUUID().slice(0, 8);
  return `cv_live_placeholder_${suffix}`;
};

export const AccountApiKeySection = ({ onNotify }: AccountApiKeySectionProps) => {
  const [apiKey, setApiKey] = useState(INITIAL_PLACEHOLDER_KEY);
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isReissueModalOpen, setIsReissueModalOpen] = useState(false);

  const displayedKey = isKeyVisible ? apiKey : maskApiKey(apiKey);

  const handleToggleVisibility = () => {
    setIsKeyVisible((current) => !current);
  };

  const handleCopyKey = async () => {
    const copied = await copyToClipboard(apiKey);
    onNotify(copied ? 'Ключ скопирован' : 'Не удалось скопировать ключ');
  };

  const handleOpenReissueModal = () => {
    setIsReissueModalOpen(true);
  };

  const handleCloseReissueModal = () => {
    setIsReissueModalOpen(false);
  };

  const handleReissueKey = () => {
    setApiKey(createPlaceholderApiKey());
    setIsKeyVisible(true);
    onNotify('Новый ключ показан один раз. Сохранение на сервере — позже.');
  };

  return (
    <section className={styles.card} aria-labelledby="api-key-title">
      <h2 id="api-key-title" className={styles.sectionTitle}>
        API-ключ
      </h2>
      <p className={styles.meta}>
        Ключ:{' '}
        <code className={styles.keyValue} translate="no">
          {displayedKey}
        </code>
      </p>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          aria-pressed={isKeyVisible}
          aria-label={isKeyVisible ? 'Скрыть API-ключ' : 'Показать API-ключ'}
          onClick={handleToggleVisibility}
        >
          {isKeyVisible ? 'Скрыть' : 'Показать'}
        </Button>
        <Button variant="secondary" onClick={() => void handleCopyKey()}>
          Скопировать
        </Button>
        <Button variant="danger" onClick={handleOpenReissueModal}>
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
        Старый ключ перестанет работать сразу. Новый ключ будет показан один раз.
      </Modal>
    </section>
  );
};
