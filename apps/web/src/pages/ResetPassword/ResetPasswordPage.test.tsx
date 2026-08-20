import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import { ResetPasswordPage } from './ResetPasswordPage';

describe('ResetPasswordPage', () => {
  it('требует код и валидный новый пароль', async () => {
    const { user } = renderWithRouter(<ResetPasswordPage />);

    await user.click(screen.getByRole('button', { name: 'Сохранить пароль' }));

    expect(screen.getByText('Введите код')).toBeInTheDocument();
    expect(screen.getByText('Введите пароль')).toBeInTheDocument();
  });
});
