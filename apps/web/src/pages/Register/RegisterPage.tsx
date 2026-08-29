import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiRequestError, NetworkError } from '@/api/http';
import { useAuthStore } from '@/app/authStore';
import { Alert } from '@/components/Alert/Alert';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { Spinner } from '@/components/Spinner/Spinner';
import {
  REGISTER_FIELD_ORDER,
  type RegisterFormErrors,
  type RegisterFormValues,
  validateRegisterForm,
} from '@/features/auth/validateAuthForm';
import { getFirstErrorField } from '@/lib/getFirstErrorField';
import { PASSWORD_HINT } from '@/lib/validatePassword';
import styles from './RegisterPage.module.scss';

const REGISTER_FIELD_IDS = {
  displayName: 'register-name',
  email: 'register-email',
  password: 'register-password',
  passwordConfirm: 'register-password-confirm',
} as const;

export const RegisterPage = () => {
  const status = useAuthStore((state) => state.status);
  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<RegisterFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isEmailTaken, setIsEmailTaken] = useState(false);
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const displayNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordConfirmRef = useRef<HTMLInputElement>(null);

  const fieldRefs = {
    displayName: displayNameRef,
    email: emailRef,
    password: passwordRef,
    passwordConfirm: passwordConfirmRef,
  };

  const getFormValues = (): RegisterFormValues => ({
    displayName,
    email,
    password,
    passwordConfirm,
  });

  const syncFieldErrors = (
    fields: readonly (keyof RegisterFormValues)[],
    values: RegisterFormValues,
  ) => {
    if (!isSubmitAttempted) {
      return;
    }

    const nextErrors = validateRegisterForm(values);
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
    setFormError(null);
    setIsEmailTaken(false);
    syncFieldErrors(['displayName'], { ...getFormValues(), displayName: value });
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setEmail(value);
    setFormError(null);
    setIsEmailTaken(false);
    syncFieldErrors(['email'], { ...getFormValues(), email: value });
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPassword(value);
    setFormError(null);
    setIsEmailTaken(false);
    syncFieldErrors(['password', 'passwordConfirm'], { ...getFormValues(), password: value });
  };

  const handlePasswordConfirmChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPasswordConfirm(value);
    setFormError(null);
    setIsEmailTaken(false);
    syncFieldErrors(['passwordConfirm'], { ...getFormValues(), passwordConfirm: value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitAttempted(true);

    const nextErrors = validateRegisterForm(getFormValues());
    setFieldErrors(nextErrors);

    const firstErrorField = getFirstErrorField(nextErrors, REGISTER_FIELD_ORDER);
    if (firstErrorField) {
      setFormError(null);
      setIsEmailTaken(false);
      fieldRefs[firstErrorField].current?.focus();
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setIsEmailTaken(false);

    try {
      await register({ displayName, email, password });
      navigate('/account', { replace: true });
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'internal_error') {
        return;
      }

      if (error instanceof ApiRequestError && error.code === 'invalid_request') {
        setIsEmailTaken(true);
        setFormError(error.userMessage);
        return;
      }

      if (error instanceof ApiRequestError || error instanceof NetworkError) {
        setFormError(error.userMessage);
        return;
      }

      setFormError('Этот email уже зарегистрирован');
      setIsEmailTaken(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="container narrowPage">
        <Spinner label="Проверяем сессию" />
      </div>
    );
  }

  if (status === 'authenticated') {
    return <Navigate to="/account" replace />;
  }

  return (
    <div className="container narrowPage">
      <div className={styles.card}>
        <h1 className={styles.title}>Регистрация</h1>
        <p className={styles.lead}>Создайте аккаунт, чтобы сохранять файлы и получить API-ключ.</p>

        <form className={styles.form} onSubmit={(event) => void handleSubmit(event)} noValidate>
          <Input
            id={REGISTER_FIELD_IDS.displayName}
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
            id={REGISTER_FIELD_IDS.email}
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
            id={REGISTER_FIELD_IDS.password}
            ref={passwordRef}
            label="Пароль"
            name="password"
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
            id={REGISTER_FIELD_IDS.passwordConfirm}
            ref={passwordConfirmRef}
            label="Подтверждение пароля"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            value={passwordConfirm}
            error={fieldErrors.passwordConfirm}
            onChange={handlePasswordConfirmChange}
            required
          />
          <Alert variant="info">
            Привязка Telegram для восстановления пароля будет доступна позже в личном кабинете.
          </Alert>
          {formError && (
            <Alert variant="error" live>
              {formError}
              {isEmailTaken && (
                <>
                  {' '}
                  <Link className={styles.errorLink} to="/login">
                    Войти
                  </Link>
                </>
              )}
            </Alert>
          )}
          <Button type="submit" fullWidth disabled={isSubmitting} aria-busy={isSubmitting}>
            Зарегистрироваться
          </Button>
        </form>

        <p className={styles.footer}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
};
