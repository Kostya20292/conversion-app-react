import { type ChangeEvent, type SubmitEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordRequest } from '@/api/auth';
import { ApiRequestError, NetworkError } from '@/api/http';
import { Alert } from '@/components/Alert/Alert';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import {
  FORGOT_PASSWORD_FIELD_ORDER,
  type ForgotPasswordFormErrors,
  type ForgotPasswordFormValues,
  validateForgotPasswordForm,
} from '@/features/auth/validateAuthForm';
import { getFirstErrorField } from '@/lib/getFirstErrorField';
import styles from './ForgotPasswordPage.module.scss';

const FORGOT_EMAIL_ID = 'forgot-email';
const FORGOT_SUCCESS_MESSAGE =
  'Если к аккаунту привязан Telegram, откройте бота и введите код. Сообщение одинаково, есть аккаунт или нет.';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ForgotPasswordFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const getFormValues = (): ForgotPasswordFormValues => ({ email });

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setEmail(value);
    setIsSubmitted(false);
    setFormError(null);

    if (!isSubmitAttempted) {
      return;
    }

    const nextErrors = validateForgotPasswordForm({ email: value });
    setFieldErrors({ email: nextErrors.email });
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitAttempted(true);

    const nextErrors = validateForgotPasswordForm(getFormValues());
    setFieldErrors(nextErrors);

    const firstErrorField = getFirstErrorField(nextErrors, FORGOT_PASSWORD_FIELD_ORDER);
    if (firstErrorField) {
      setIsSubmitted(false);
      setFormError(null);
      emailRef.current?.focus();
      return;
    }

    void (async () => {
      setIsSubmitting(true);
      setFormError(null);

      try {
        await forgotPasswordRequest(email.trim());
        setIsSubmitted(true);
      } catch (error) {
        setIsSubmitted(false);

        if (error instanceof ApiRequestError && error.code === 'internal_error') {
          return;
        }

        if (error instanceof ApiRequestError || error instanceof NetworkError) {
          setFormError(error.userMessage);
          return;
        }

        setFormError('Не удалось запросить код. Попробуйте ещё раз.');
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  return (
    <div className="container narrowPage">
      <div className={styles.card}>
        <h1 className={styles.title}>Восстановление пароля</h1>
        <p className={styles.lead}>
          Укажите email — мы отправим инструкцию, если аккаунт существует.
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            id={FORGOT_EMAIL_ID}
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
          {formError && (
            <Alert variant="error" live>
              {formError}
            </Alert>
          )}
          {isSubmitted && (
            <Alert variant="info" live>
              {FORGOT_SUCCESS_MESSAGE}
            </Alert>
          )}
          <Button type="submit" fullWidth disabled={isSubmitting} aria-busy={isSubmitting}>
            Запросить код
          </Button>
        </form>

        <div className={styles.footer}>
          <Link to="/login">Вернуться ко входу</Link>
          <Link to="/reset-password">Ввести код</Link>
        </div>
      </div>
    </div>
  );
};
