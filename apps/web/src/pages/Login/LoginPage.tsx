import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '@/components/Alert/Alert';
import { Button } from '@/components/Button/Button';
import { Checkbox } from '@/components/Checkbox/Checkbox';
import { Input } from '@/components/Input/Input';
import styles from './LoginPage.module.scss';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.card}>
        <h1 className={styles.title}>Вход</h1>
        <p className={styles.lead}>Войдите, чтобы открыть личный кабинет и API-ключ.</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            id="login-email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            id="login-password"
            label="Пароль"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Checkbox
            id="login-remember"
            label="Запомнить меня"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          <Alert variant="info">Авторизация подключится на следующем этапе.</Alert>
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
