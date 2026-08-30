import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoginPage } from '@/pages/Login/LoginPage';
import { renderWithRouter } from '@/test/renderWithRouter';

describe('LoginPage', () => {
  it('показывает ошибки полей при пустой отправке', async () => {
    const { user } = renderWithRouter(<LoginPage />);

    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(screen.getByText('Введите email')).toBeInTheDocument();
    expect(screen.getByText('Введите пароль')).toBeInTheDocument();
  });

  it('показывает ошибку некорректного email', async () => {
    const { user } = renderWithRouter(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Пароль'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(screen.getByText('Введите корректный email')).toBeInTheDocument();
  });

  it('ведёт на восстановление пароля', () => {
    renderWithRouter(<LoginPage />);

    expect(screen.getByRole('link', { name: 'Забыли пароль?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });
});
