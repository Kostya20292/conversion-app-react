import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NotFoundPage } from '@/pages/NotFound/NotFoundPage';
import { renderWithRouter } from '@/test/renderWithRouter';

describe('NotFoundPage', () => {
  it('сообщает, что страница не найдена, и ведёт на главную', () => {
    renderWithRouter(<NotFoundPage />);

    expect(screen.getByRole('heading', { name: 'Страница не найдена' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute('href', '/');
  });
});
