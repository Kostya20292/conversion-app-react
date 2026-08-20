import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import { Header } from './Header';

describe('Header', () => {
  it('для гостя показывает вход вместо личного кабинета', () => {
    renderWithRouter(<Header isAuthenticated={false} />);

    expect(screen.getByRole('link', { name: 'Войти' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('link', { name: 'ЛК' })).not.toBeInTheDocument();
  });

  it('для пользователя показывает ссылку в личный кабинет', () => {
    renderWithRouter(<Header isAuthenticated />);

    expect(screen.getByRole('link', { name: 'ЛК' })).toHaveAttribute('href', '/account');
    expect(screen.queryByRole('link', { name: 'Войти' })).not.toBeInTheDocument();
  });
});
