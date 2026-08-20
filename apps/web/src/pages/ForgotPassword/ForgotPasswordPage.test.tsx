import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import { ForgotPasswordPage } from './ForgotPasswordPage';

describe('ForgotPasswordPage', () => {
  it('требует email перед запросом кода', async () => {
    const { user } = renderWithRouter(<ForgotPasswordPage />);

    await user.click(screen.getByRole('button', { name: 'Запросить код' }));

    expect(screen.getByText('Введите email')).toBeInTheDocument();
  });
});
