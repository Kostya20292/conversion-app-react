import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RegisterPage } from '@/pages/Register/RegisterPage';
import { renderWithRouter } from '@/test/renderWithRouter';

describe('RegisterPage', () => {
  it('показывает правило пароля до ошибки', () => {
    renderWithRouter(<RegisterPage />);

    expect(screen.getByText('Не меньше 8 символов, буква и цифра')).toBeInTheDocument();
  });

  it('отклоняет слабый пароль при регистрации', async () => {
    const { user } = renderWithRouter(<RegisterPage />);

    await user.type(screen.getByLabelText('Имя'), 'Иван');
    await user.type(screen.getByLabelText('Email'), 'ivan@example.com');
    await user.type(screen.getByLabelText('Пароль'), '123');
    await user.type(screen.getByLabelText('Подтверждение пароля'), '123');
    await user.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));

    expect(screen.getByText('Пароль должен содержать не меньше 8 символов')).toBeInTheDocument();
  });
});
