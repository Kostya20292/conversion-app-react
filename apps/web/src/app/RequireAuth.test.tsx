import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/app/authStore';
import { RequireAuth } from '@/app/RequireAuth';

const renderAccountRoute = () => {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <div>Вход</div> },
      {
        path: '/account',
        element: (
          <RequireAuth>
            <div>Личный кабинет</div>
          </RequireAuth>
        ),
      },
    ],
    { initialEntries: ['/account'] },
  );

  return { router, ...render(<RouterProvider router={router} />) };
};

describe('RequireAuth', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'anonymous' });
  });

  it('гостя с защищённой страницы отправляет на вход с next', async () => {
    const { router } = renderAccountRoute();

    expect(await screen.findByText('Вход')).toBeInTheDocument();
    expect(screen.queryByText('Личный кабинет')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=/account');
  });

  it('авторизованному показывает защищённую страницу', () => {
    useAuthStore.setState({
      user: { id: 'user-1', email: 'ivan@example.com', displayName: 'Иван' },
      status: 'authenticated',
    });

    renderAccountRoute();

    expect(screen.getByText('Личный кабинет')).toBeInTheDocument();
    expect(screen.queryByText('Вход')).not.toBeInTheDocument();
  });
});
