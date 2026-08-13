import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '@/components/Alert/Alert';
import { Button } from '@/components/Button/Button';
import { Checkbox } from '@/components/Checkbox/Checkbox';
import { Input } from '@/components/Input/Input';
import {
  getFirstErrorField,
  LOGIN_FIELD_ORDER,
  type LoginFormErrors,
  type LoginFormValues,
  validateLoginForm,
} from '@/features/auth/validateAuthForm';
import styles from './LoginPage.module.scss';

const LOGIN_FIELD_IDS = {
  email: 'login-email',
  password: 'login-password',
} as const;

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  const [isClientAccepted, setIsClientAccepted] = useState(false);
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
    setIsClientAccepted(false);
    syncFieldError('email', { email: value, password });
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPassword(value);
    setIsClientAccepted(false);
    syncFieldError('password', { email, password: value });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitAttempted(true);

    const nextErrors = validateLoginForm(getFormValues());
    setFieldErrors(nextErrors);

    const firstErrorField = getFirstErrorField(nextErrors, LOGIN_FIELD_ORDER);
    if (firstErrorField) {
      setIsClientAccepted(false);
      fieldRefs[firstErrorField].current?.focus();
      return;
    }

    setIsClientAccepted(true);
  };

  return (
    <div className="container narrowPage">
      <div className={styles.card}>
        <h1 className={styles.title}>Вход</h1>
        <p className={styles.lead}>Войдите, чтобы открыть личный кабинет и API-ключ.</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
          {isClientAccepted ? (
            <Alert variant="info">Авторизация подключится на следующем этапе.</Alert>
          ) : null}
          <Button type="submit" fullWidth>
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
