import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './AppLayout';

describe('AppLayout', () => {
  it('даёт skip-link к содержимому и вход для гостя', () => {
    const router = createMemoryRouter([
      {
        path: '/',
        element: <AppLayout />,
        children: [{ index: true, element: <div>Контент</div> }],
      },
    ]);

    render(<RouterProvider router={router} />);

    expect(screen.getByRole('link', { name: 'Перейти к содержимому' })).toHaveAttribute(
      'href',
      '#content',
    );
    expect(screen.getByRole('link', { name: 'Войти' })).toBeInTheDocument();
  });
});
