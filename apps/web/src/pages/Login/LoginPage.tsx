import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiRequestError, NetworkError } from '@/api/http';
import { useAuthStore } from '@/app/authStore';
import { Alert } from '@/components/Alert/Alert';
import { Button } from '@/components/Button/Button';
import { Checkbox } from '@/components/Checkbox/Checkbox';
import { Input } from '@/components/Input/Input';
import { Spinner } from '@/components/Spinner/Spinner';
import {
  LOGIN_FIELD_ORDER,
  type LoginFormErrors,
  type LoginFormValues,
  validateLoginForm,
} from '@/features/auth/validateAuthForm';
import { getFirstErrorField } from '@/lib/getFirstErrorField';
import { getSafeNextPath } from '@/lib/getSafeNextPath';
import styles from './LoginPage.module.scss';

const LOGIN_FIELD_IDS = {
  email: 'login-email',
  password: 'login-password',
} as const;

export const LoginPage = () => {
  const status = useAuthStore((state) => state.status);
  const login = useAuthStore((state) => state.login);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const nextPath = getSafeNextPath(searchParams.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const fieldRefs = {
    email: emailRef,
    password: passwordRef,
  };

  const getFormValues = (): LoginFormValues => ({ email, password });

  const syncFieldError = (field: keyof LoginFormValues, values: LoginFormValues) => {
    if (!isSubmitAttempted) {
      return;
    }

    const nextErrors = validateLoginForm(values);
    setFieldErrors((current) => ({ ...current, [field]: nextErrors[field] }));
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setEmail(value);
    setFormError(null);
    syncFieldError('email', { email: value, password });
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPassword(value);
    setFormError(null);
    syncFieldError('password', { email, password: value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitAttempted(true);

    const nextErrors = validateLoginForm(getFormValues());
    setFieldErrors(nextErrors);

    const firstErrorField = getFirstErrorField(nextErrors, LOGIN_FIELD_ORDER);
    if (firstErrorField) {
      setFormError(null);
      fieldRefs[firstErrorField].current?.focus();
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await login({ email, password, rememberMe });
      navigate(nextPath, { replace: true });
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'internal_error') {
        return;
      }

      if (error instanceof ApiRequestError || error instanceof NetworkError) {
        setFormError(error.userMessage);
        return;
      }

      setFormError('Неверный email или пароль');
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
    return <Navigate to={nextPath} replace />;
  }

  return (
    <div className="container narrowPage">
      <div className={styles.card}>
        <h1 className={styles.title}>Вход</h1>
        <p className={styles.lead}>Войдите, чтобы открыть личный кабинет и API-ключ.</p>

        <form className={styles.form} onSubmit={(event) => void handleSubmit(event)} noValidate>
          <Input
            id={LOGIN_FIELD_IDS.email}
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
            id={LOGIN_FIELD_IDS.password}
            ref={passwordRef}
            label="Пароль"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            error={fieldErrors.password}
            onChange={handlePasswordChange}
            required
          />
          <Checkbox
            id="login-remember"
            label="Запомнить меня"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          {formError && (
            <Alert variant="error" live>
              {formError}
            </Alert>
          )}
          <Button type="submit" fullWidth disabled={isSubmitting} aria-busy={isSubmitting}>
            Войти
          </Button>
        </form>

        <div className={styles.links}>
          <Link to="/forgot-password">Забыли пароль?</Link>
          <Link to="/register">Создать аккаунт</Link>
        </div>
      </div>
    </div>
  );
};
