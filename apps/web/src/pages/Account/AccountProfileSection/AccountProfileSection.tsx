import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import { useAuthStore } from '@/app/authStore';
import { Alert } from '@/components/Alert/Alert';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { Modal } from '@/components/Modal/Modal';
import {
  ACCOUNT_PROFILE_FIELD_ORDER,
  type AccountProfileFormErrors,
  type AccountProfileFormValues,
  validateAccountProfileForm,
} from '@/features/account/validateAccountProfile';
import { getFirstErrorField } from '@/lib/getFirstErrorField';
import { PASSWORD_HINT } from '@/lib/validatePassword';
import type { AccountProfileSectionProps } from './AccountProfileSection.types';
import styles from './AccountProfileSection.module.scss';

const FIELD_IDS = {
  displayName: 'account-name',
  email: 'account-email',
  currentPassword: 'account-current-password',
  newPassword: 'account-new-password',
  newPasswordConfirm: 'account-new-password-confirm',
} as const;

export const AccountProfileSection = ({ onNotify }: AccountProfileSectionProps) => {
  const user = useAuthStore((state) => state.user);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [savedEmail, setSavedEmail] = useState(user?.email ?? '');
  const [fieldErrors, setFieldErrors] = useState<AccountProfileFormErrors>({});
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  const [isClientAccepted, setIsClientAccepted] = useState(false);
  const [isTelegramBound, setIsTelegramBound] = useState(Boolean(user?.telegramId));
  const [isUnbindModalOpen, setIsUnbindModalOpen] = useState(false);
  const displayNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordConfirmRef = useRef<HTMLInputElement>(null);

  const fieldRefs = {
    displayName: displayNameRef,
    email: emailRef,
    currentPassword: currentPasswordRef,
    newPassword: newPasswordRef,
    newPasswordConfirm: newPasswordConfirmRef,
  };

  const getFormValues = (): AccountProfileFormValues => ({
    displayName,
    email,
    currentPassword,
    newPassword,
    newPasswordConfirm,
  });

  const syncFieldErrors = (
    fields: readonly (keyof AccountProfileFormValues)[],
    values: AccountProfileFormValues,
  ) => {
    if (!isSubmitAttempted) {
      return;
    }

    const nextErrors = validateAccountProfileForm(values, savedEmail);
    setFieldErrors((current) => {
      const next = { ...current };
      for (const field of fields) {
        next[field] = nextErrors[field];
      }
      return next;
    });
  };

  const handleDisplayNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setDisplayName(value);
    setIsClientAccepted(false);
    syncFieldErrors(['displayName'], { ...getFormValues(), displayName: value });
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setEmail(value);
    setIsClientAccepted(false);
    syncFieldErrors(['email', 'currentPassword'], { ...getFormValues(), email: value });
  };

  const handleCurrentPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setCurrentPassword(value);
    setIsClientAccepted(false);
    syncFieldErrors(['currentPassword'], { ...getFormValues(), currentPassword: value });
  };

  const handleNewPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setNewPassword(value);
    setIsClientAccepted(false);
    syncFieldErrors(['currentPassword', 'newPassword', 'newPasswordConfirm'], {
      ...getFormValues(),
      newPassword: value,
    });
  };

  const handleNewPasswordConfirmChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setNewPasswordConfirm(value);
    setIsClientAccepted(false);
    syncFieldErrors(['newPasswordConfirm'], { ...getFormValues(), newPasswordConfirm: value });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitAttempted(true);

    const values = getFormValues();
    const nextErrors = validateAccountProfileForm(values, savedEmail);
    setFieldErrors(nextErrors);

    const firstErrorField = getFirstErrorField(nextErrors, ACCOUNT_PROFILE_FIELD_ORDER);
    if (firstErrorField) {
      setIsClientAccepted(false);
      fieldRefs[firstErrorField].current?.focus();
      return;
    }

    setSavedEmail(values.email.trim());
    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setIsClientAccepted(true);
  };

  const handleBindTelegram = () => {
    setIsTelegramBound(true);
    onNotify('Привязка Telegram на этом этапе локальная. Живой бот подключится позже.');
  };

  const handleOpenUnbindModal = () => {
    setIsUnbindModalOpen(true);
  };

  const handleCloseUnbindModal = () => {
    setIsUnbindModalOpen(false);
  };

  const handleUnbindTelegram = () => {
    setIsTelegramBound(false);
    onNotify('Telegram отвязан в интерфейсе. Сохранение на сервере — позже.');
  };

  return (
    <section className={styles.card} aria-labelledby="profile-title">
      <h2 id="profile-title" className={styles.sectionTitle}>
        Профиль
      </h2>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Input
          id={FIELD_IDS.displayName}
          ref={displayNameRef}
          label="Имя"
          name="name"
          autoComplete="name"
          value={displayName}
          error={fieldErrors.displayName}
          onChange={handleDisplayNameChange}
          required
        />
        <Input
          id={FIELD_IDS.email}
          ref={emailRef}
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          error={fieldErrors.email}
          onChange={handleEmailChange}
          required
        />
        <Input
          id={FIELD_IDS.currentPassword}
          ref={currentPasswordRef}
          label="Текущий пароль"
          name="current-password"
          type="password"
          autoComplete="current-password"
          hint="Нужен, чтобы сменить email или пароль"
          value={currentPassword}
          error={fieldErrors.currentPassword}
          onChange={handleCurrentPasswordChange}
        />
        <Input
          id={FIELD_IDS.newPassword}
          ref={newPasswordRef}
          label="Новый пароль"
          name="new-password"
          type="password"
          autoComplete="new-password"
          hint={PASSWORD_HINT}
          minLength={8}
          value={newPassword}
          error={fieldErrors.newPassword}
          onChange={handleNewPasswordChange}
        />
        <Input
          id={FIELD_IDS.newPasswordConfirm}
          ref={newPasswordConfirmRef}
          label="Подтверждение нового пароля"
          name="new-password-confirm"
          type="password"
          autoComplete="new-password"
          value={newPasswordConfirm}
          error={fieldErrors.newPasswordConfirm}
          onChange={handleNewPasswordConfirmChange}
        />
        {isClientAccepted && (
          <Alert variant="info" live>
            Сохранение профиля подключится на следующем этапе.
          </Alert>
        )}
        <Button type="submit" variant="secondary">
          Сохранить профиль
        </Button>
      </form>

      <div className={styles.telegram}>
        <h3 className={styles.subTitle}>Telegram</h3>
        <p className={styles.metaText}>
          Статус: {isTelegramBound ? 'Привязан' : 'Не привязан'}. Нужен для восстановления пароля.
        </p>
        {isTelegramBound ? (
          <Button variant="danger" onClick={handleOpenUnbindModal}>
            Отвязать Telegram
          </Button>
        ) : (
          <Button variant="secondary" onClick={handleBindTelegram}>
            Привязать Telegram
          </Button>
        )}
      </div>

      <Modal
        open={isUnbindModalOpen}
        title="Отвязать Telegram?"
        onClose={handleCloseUnbindModal}
        confirmLabel="Отвязать"
        cancelLabel="Отмена"
        danger
        onConfirm={handleUnbindTelegram}
      >
        После отвязки нельзя будет восстановить пароль через Telegram, пока бот не привязан снова.
      </Modal>
    </section>
  );
};
