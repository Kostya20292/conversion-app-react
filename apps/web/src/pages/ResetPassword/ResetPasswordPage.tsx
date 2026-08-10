import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '@/components/Alert/Alert';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import styles from './ResetPasswordPage.module.scss';

export const ResetPasswordPage = () => {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.card}>
        <h1 className={styles.title}>Новый пароль</h1>
        <p className={styles.lead}>Введите код из Telegram и задайте новый пароль.</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            id="reset-code"
            label="Код"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
          <Input
            id="reset-password"
            label="Новый пароль"
            type="password"
            autoComplete="new-password"
            hint="Не меньше 8 символов, буква и цифра"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Input
            id="reset-password-confirm"
            label="Подтверждение пароля"
            type="password"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            required
          />
          <Alert variant="info">
            Проверка кода и смена пароля появятся на этапе восстановления.
          </Alert>
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
