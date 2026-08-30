import { type ChangeEvent, type SubmitEvent, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resetPasswordRequest } from '@/api/auth';
import { ApiRequestError, NetworkError } from '@/api/http';
import { Alert } from '@/components/Alert/Alert';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import {
  RESET_PASSWORD_FIELD_ORDER,
  type ResetPasswordFormErrors,
  type ResetPasswordFormValues,
  validateResetPasswordForm,
} from '@/features/auth/validateAuthForm';
import { getFirstErrorField } from '@/lib/getFirstErrorField';
import { PASSWORD_HINT } from '@/lib/validatePassword';
import styles from './ResetPasswordPage.module.scss';

const RESET_FIELD_IDS = {
  code: 'reset-code',
  password: 'reset-password',
  passwordConfirm: 'reset-password-confirm',
} as const;

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordConfirmRef = useRef<HTMLInputElement>(null);

  const fieldRefs = {
    code: codeRef,
    password: passwordRef,
    passwordConfirm: passwordConfirmRef,
  };

  const getFormValues = (): ResetPasswordFormValues => ({
    code,
    password,
    passwordConfirm,
  });

  const syncFieldErrors = (
    fields: readonly (keyof ResetPasswordFormValues)[],
    values: ResetPasswordFormValues,
  ) => {
    if (!isSubmitAttempted) {
      return;
    }

    const nextErrors = validateResetPasswordForm(values);
    setFieldErrors((current) => {
      const next = { ...current };
      for (const field of fields) {
        next[field] = nextErrors[field];
      }
      return next;
    });
  };

  const handleCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setCode(value);
    setFormError(null);
    syncFieldErrors(['code'], { ...getFormValues(), code: value });
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPassword(value);
    setFormError(null);
    syncFieldErrors(['password', 'passwordConfirm'], { ...getFormValues(), password: value });
  };

  const handlePasswordConfirmChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPasswordConfirm(value);
    setFormError(null);
    syncFieldErrors(['passwordConfirm'], { ...getFormValues(), passwordConfirm: value });
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitAttempted(true);

    const nextErrors = validateResetPasswordForm(getFormValues());
    setFieldErrors(nextErrors);

    const firstErrorField = getFirstErrorField(nextErrors, RESET_PASSWORD_FIELD_ORDER);
    if (firstErrorField) {
      setFormError(null);
      fieldRefs[firstErrorField].current?.focus();
      return;
    }

    void (async () => {
      setIsSubmitting(true);
      setFormError(null);

      try {
        await resetPasswordRequest({ code: code.trim(), password });
        navigate('/login', { replace: true });
      } catch (error) {
        if (error instanceof ApiRequestError && error.code === 'internal_error') {
          return;
        }

        if (error instanceof ApiRequestError || error instanceof NetworkError) {
          setFormError(error.userMessage);
          return;
        }

        setFormError('Не удалось сохранить пароль. Попробуйте ещё раз.');
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  return (
    <div className="container narrowPage">
      <div className={styles.card}>
        <h1 className={styles.title}>Новый пароль</h1>
        <p className={styles.lead}>Введите код из Telegram и задайте новый пароль.</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            id={RESET_FIELD_IDS.code}
            ref={codeRef}
            label="Код"
            name="one-time-code"
            autoComplete="one-time-code"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={code}
            error={fieldErrors.code}
            onChange={handleCodeChange}
            required
          />
          <Input
            id={RESET_FIELD_IDS.password}
            ref={passwordRef}
            label="Новый пароль"
            name="new-password"
            type="password"
            autoComplete="new-password"
            hint={PASSWORD_HINT}
            minLength={8}
            value={password}
            error={fieldErrors.password}
            onChange={handlePasswordChange}
            required
          />
          <Input
            id={RESET_FIELD_IDS.passwordConfirm}
            ref={passwordConfirmRef}
            label="Подтверждение пароля"
            name="new-password-confirm"
            type="password"
            autoComplete="new-password"
            value={passwordConfirm}
            error={fieldErrors.passwordConfirm}
            onChange={handlePasswordConfirmChange}
            required
          />
          {formError && (
            <Alert variant="error" live>
              {formError}
            </Alert>
          )}
          <Button type="submit" fullWidth disabled={isSubmitting} aria-busy={isSubmitting}>
            Сохранить пароль
          </Button>
        </form>

        <p className={styles.footer}>
          <Link to="/login">Ко входу</Link>
        </p>
      </div>
    </div>
  );
};
