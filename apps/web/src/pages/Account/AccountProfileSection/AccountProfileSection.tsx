import { type ChangeEvent, type SubmitEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMeRequest } from '@/api/auth';
import { ApiRequestError, NetworkError } from '@/api/http';
import { bindTelegramRequest, confirmTelegramRequest, unbindTelegramRequest } from '@/api/telegram';
import { patchMeRequest } from '@/api/users';
import { useAuthStore } from '@/app/authStore';
import { Alert } from '@/components/Alert/Alert';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { Modal } from '@/components/Modal/Modal';
import { pollTelegramBind } from '@/features/account/pollTelegramBind';
import {
  ACCOUNT_PROFILE_FIELD_ORDER,
  type AccountProfileFormErrors,
  type AccountProfileFormValues,
  validateAccountProfileForm,
} from '@/features/account/validateAccountProfile';
import { getFirstErrorField } from '@/lib/getFirstErrorField';
import { telegramBindUrl } from '@/lib/telegramBindUrl';
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

const isAbortError = (error: unknown): boolean =>
  (error instanceof DOMException && error.name === 'AbortError') ||
  (error instanceof Error && error.name === 'AbortError');

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
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [isTelegramBusy, setIsTelegramBusy] = useState(false);
  const [isUnbindModalOpen, setIsUnbindModalOpen] = useState(false);
  const [telegramBindUrlValue, setTelegramBindUrlValue] = useState<string | null>(null);
  const telegramBindAbortRef = useRef<AbortController | null>(null);
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

  useEffect(() => {
    return () => {
      telegramBindAbortRef.current?.abort();
    };
  }, []);

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

  const handleCancelTelegramBind = () => {
    telegramBindAbortRef.current?.abort();
    telegramBindAbortRef.current = null;
    setTelegramBindUrlValue(null);
    setIsTelegramBusy(false);
  };

  const handleBindTelegram = () => {
    if (!user) {
      return;
    }

    void (async () => {
      telegramBindAbortRef.current?.abort();
      setIsTelegramBusy(true);
      setTelegramError(null);
      setTelegramBindUrlValue(null);

      try {
        const bind = await bindTelegramRequest();
        if (bind.bot_username === null || bind.bot_username.length === 0) {
          await confirmTelegramRequest({
            bindToken: bind.bind_token,
            telegramId: user.id.replaceAll('-', '').slice(0, 32),
          });
          const updated = await getMeRequest();
          applyUser(updated);
          onNotify('Telegram привязан. Теперь можно восстановить пароль через бота.');
          return;
        }

        const url = telegramBindUrl(bind.bot_username, bind.start_param);
        setTelegramBindUrlValue(url);
        window.open(url, '_blank', 'noopener,noreferrer');

        const abort = new AbortController();
        telegramBindAbortRef.current = abort;
        const result = await pollTelegramBind({
          getUser: () => getMeRequest({ signal: abort.signal }),
          signal: abort.signal,
        });

        if (!result.ok) {
          setTelegramError(
            'Не дождались подтверждения. Откройте бота и нажмите Start или запросите ссылку снова.',
          );
          return;
        }

        applyUser(result.user);
        setTelegramBindUrlValue(null);
        onNotify('Telegram привязан. Теперь можно восстановить пароль через бота.');
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        if (error instanceof ApiRequestError && error.code === 'internal_error') {
          return;
        }

        if (error instanceof ApiRequestError || error instanceof NetworkError) {
          setTelegramError(error.userMessage);
          return;
        }

        setTelegramError('Не удалось привязать Telegram. Попробуйте ещё раз.');
      } finally {
        setIsTelegramBusy(false);
      }
    })();
  };

  const handleOpenUnbindModal = () => {
    setIsUnbindModalOpen(true);
  };

  const handleCloseUnbindModal = () => {
    setIsUnbindModalOpen(false);
  };

  const handleUnbindTelegram = () => {
    void (async () => {
      setIsTelegramBusy(true);
      setTelegramError(null);

      try {
        await unbindTelegramRequest();
        const updated = await getMeRequest();
        applyUser(updated);
        setIsUnbindModalOpen(false);
        onNotify('Telegram отвязан. Восстановление пароля через бота недоступно.');
      } catch (error) {
        if (error instanceof ApiRequestError && error.code === 'internal_error') {
          return;
        }

        if (error instanceof ApiRequestError || error instanceof NetworkError) {
          setTelegramError(error.userMessage);
          return;
        }

        setTelegramError('Не удалось отвязать Telegram. Попробуйте ещё раз.');
      } finally {
        setIsTelegramBusy(false);
      }
    })();
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
          Статус: {user?.telegramId ? 'Привязан' : 'Не привязан'}. Нужен для восстановления пароля.
        </p>
        {telegramError && (
          <Alert variant="error" live>
            {telegramError}
          </Alert>
        )}
        {user?.telegramId && (
          <Button
            variant="danger"
            className={styles.telegramAction}
            onClick={handleOpenUnbindModal}
            disabled={isTelegramBusy}
            aria-busy={isTelegramBusy}
          >
            Отвязать Telegram
          </Button>
        )}
        {!user?.telegramId && telegramBindUrlValue && (
          <>
            <p className={styles.metaText} aria-live="polite">
              Откройте бота и нажмите Start. Статус обновится сам.
            </p>
            <a
              className={styles.telegramLink}
              href={telegramBindUrlValue}
              target="_blank"
              rel="noopener noreferrer"
            >
              Открыть Telegram-бота
            </a>
            <Button
              variant="tertiary"
              className={styles.telegramAction}
              onClick={handleCancelTelegramBind}
            >
              Отмена
            </Button>
          </>
        )}
        {!user?.telegramId && !telegramBindUrlValue && (
          <Button
            variant="secondary"
            className={styles.telegramAction}
            onClick={handleBindTelegram}
            disabled={isTelegramBusy}
            aria-busy={isTelegramBusy}
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
