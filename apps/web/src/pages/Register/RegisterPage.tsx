import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '@/components/Alert/Alert';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import styles from './RegisterPage.module.scss';

export const RegisterPage = () => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.card}>
        <h1 className={styles.title}>Регистрация</h1>
        <p className={styles.lead}>Создайте аккаунт, чтобы сохранять файлы и получить API-ключ.</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            id="register-name"
            label="Имя"
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
          <Input
            id="register-email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            id="register-password"
            label="Пароль"
            type="password"
            autoComplete="new-password"
            hint="Не меньше 8 символов, буква и цифра"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Input
            id="register-password-confirm"
            label="Подтверждение пароля"
            type="password"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            required
          />
          <Alert variant="info">
            Привязка Telegram для восстановления пароля будет доступна позже в личном кабинете.
          </Alert>
          <Button type="submit" fullWidth>
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
