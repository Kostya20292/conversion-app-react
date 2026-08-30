import { type ChangeEvent, type SubmitEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiRequestError, NetworkError } from '@/api/http';
import { patchMeRequest } from '@/api/users';
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
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const applyUser = useAuthStore((state) => state.applyUser);
  const logout = useAuthStore((state) => state.logout);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [savedEmail, setSavedEmail] = useState(user?.email ?? '');
  const [fieldErrors, setFieldErrors] = useState<AccountProfileFormErrors>({});
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    setSubmitError(null);
    syncFieldErrors(['displayName'], { ...getFormValues(), displayName: value });
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setEmail(value);
    setSubmitError(null);
    syncFieldErrors(['email', 'currentPassword'], { ...getFormValues(), email: value });
  };

  const handleCurrentPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setCurrentPassword(value);
    setSubmitError(null);
    syncFieldErrors(['currentPassword'], { ...getFormValues(), currentPassword: value });
  };

  const handleNewPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setNewPassword(value);
    setSubmitError(null);
    syncFieldErrors(['currentPassword', 'newPassword', 'newPasswordConfirm'], {
      ...getFormValues(),
      newPassword: value,
    });
  };

  const handleNewPasswordConfirmChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setNewPasswordConfirm(value);
    setSubmitError(null);
    syncFieldErrors(['newPasswordConfirm'], { ...getFormValues(), newPasswordConfirm: value });
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitAttempted(true);

    const values = getFormValues();
    const nextErrors = validateAccountProfileForm(values, savedEmail);
    setFieldErrors(nextErrors);

    const firstErrorField = getFirstErrorField(nextErrors, ACCOUNT_PROFILE_FIELD_ORDER);
    if (firstErrorField) {
      setSubmitError(null);
      fieldRefs[firstErrorField].current?.focus();
      return;
    }

    const emailChanged = values.email.trim() !== savedEmail.trim();
    const passwordChanged = values.newPassword.length > 0;

    void (async () => {
      setIsSaving(true);
      setSubmitError(null);

      try {
        const updated = await patchMeRequest({
          displayName: values.displayName.trim(),
          email: values.email.trim(),
          currentPassword: emailChanged || passwordChanged ? values.currentPassword : undefined,
          newPassword: passwordChanged ? values.newPassword : undefined,
        });

        if (emailChanged || passwordChanged) {
          await logout();
          navigate('/login?next=/account', { replace: true });
          return;
        }

        applyUser(updated);
        setSavedEmail(updated.email);
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
        onNotify('Профиль сохранён');
      } catch (error) {
        if (error instanceof ApiRequestError && error.code === 'internal_error') {
          return;
        }

        if (error instanceof ApiRequestError || error instanceof NetworkError) {
          setSubmitError(error.userMessage);
          return;
        }

        setSubmitError('Не удалось сохранить профиль. Попробуйте ещё раз.');
      } finally {
        setIsSaving(false);
      }
    })();
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
        {submitError && (
          <Alert variant="error" live>
            {submitError}
          </Alert>
        )}
        <Button type="submit" variant="secondary" disabled={isSaving} aria-busy={isSaving}>
          Сохранить профиль
        </Button>
      </form>

      <div className={styles.telegram}>
        <h3 className={styles.subTitle}>Telegram</h3>
        <p className={styles.metaText}>
          Статус: {isTelegramBound ? 'Привязан' : 'Не привязан'}. Нужен для восстановления пароля.
        </p>
        {isTelegramBound ? (
          <Button
            variant="danger"
            className={styles.telegramAction}
            onClick={handleOpenUnbindModal}
          >
            Отвязать Telegram
          </Button>
        ) : (
          <Button
            variant="secondary"
            className={styles.telegramAction}
            onClick={handleBindTelegram}
          >
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
