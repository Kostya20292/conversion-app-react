import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '@/components/Alert/Alert';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import styles from './ForgotPasswordPage.module.scss';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.card}>
        <h1 className={styles.title}>Восстановление пароля</h1>
        <p className={styles.lead}>
          Укажите email — мы отправим инструкцию, если аккаунт существует.
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            id="forgot-email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Alert variant="info">
            В v1 восстановление идёт через Telegram-бота (mock). Логика подключится позже.
          </Alert>
          <Button type="submit" fullWidth>
            Продолжить
          </Button>
        </form>

        <p className={styles.footer}>
          <Link to="/login">Вернуться ко входу</Link>
        </p>
      </div>
    </div>
  );
};
