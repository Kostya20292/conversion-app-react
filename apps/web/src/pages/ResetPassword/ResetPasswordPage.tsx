import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '@/components/Alert/Alert';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import {
  getFirstErrorField,
  RESET_PASSWORD_FIELD_ORDER,
  type ResetPasswordFormErrors,
  type ResetPasswordFormValues,
  validateResetPasswordForm,
} from '@/features/auth/validateAuthForm';
import { PASSWORD_HINT } from '@/lib/validatePassword';
import styles from './ResetPasswordPage.module.scss';

const RESET_FIELD_IDS = {
  code: 'reset-code',
  password: 'reset-password',
  passwordConfirm: 'reset-password-confirm',
} as const;

export const ResetPasswordPage = () => {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordFormErrors>({});
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  const [isClientAccepted, setIsClientAccepted] = useState(false);
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
    setIsClientAccepted(false);
    syncFieldErrors(['code'], { ...getFormValues(), code: value });
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPassword(value);
    setIsClientAccepted(false);
    syncFieldErrors(['password', 'passwordConfirm'], { ...getFormValues(), password: value });
  };

  const handlePasswordConfirmChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPasswordConfirm(value);
    setIsClientAccepted(false);
    syncFieldErrors(['passwordConfirm'], { ...getFormValues(), passwordConfirm: value });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitAttempted(true);

    const nextErrors = validateResetPasswordForm(getFormValues());
    setFieldErrors(nextErrors);

    const firstErrorField = getFirstErrorField(nextErrors, RESET_PASSWORD_FIELD_ORDER);
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
          {isClientAccepted ? (
            <Alert variant="info">
              Проверка кода и смена пароля появятся на этапе восстановления.
            </Alert>
          ) : null}
          <Button type="submit" fullWidth>
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
