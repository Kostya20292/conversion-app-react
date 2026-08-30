import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/app/authStore';
import { ApiDocsPage } from '@/pages/ApiDocs/ApiDocsPage';
import { renderWithRouter } from '@/test/renderWithRouter';

describe('ApiDocsPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'anonymous', issuedApiKey: null });
  });

  it('описывает базовый URL и заголовок X-API-Key', () => {
    renderWithRouter(<ApiDocsPage />);
    const intro = screen.getByText(/Публичное API/);

    expect(screen.getByRole('heading', { name: 'API Convertly' })).toBeInTheDocument();
    expect(intro).toHaveTextContent('X-API-Key');
    expect(intro).toHaveTextContent('/api/v1');
  });

  it('ведёт быстрый старт через регистрацию, ключ, jobs и скачивание', () => {
    renderWithRouter(<ApiDocsPage />);
    const quickstart = screen.getByRole('region', { name: 'Быстрый старт' });

    expect(within(quickstart).getByText(/скопируйте API-ключ/)).toBeInTheDocument();
    expect(within(quickstart).getByText(/POST \/api\/v1\/jobs/)).toBeInTheDocument();
    expect(within(quickstart).getByText(/GET \/api\/v1\/jobs\/:id\/download/)).toBeInTheDocument();
  });

  it('показывает таблицу эндпоинтов канона /api/v1, а не устаревший /convert', () => {
    renderWithRouter(<ApiDocsPage />);
    const table = screen.getByRole('table', { name: 'Эндпоинты' });

    expect(table).toHaveTextContent('POST');
    expect(table).toHaveTextContent('/api/v1/jobs');
    expect(table).toHaveTextContent('/api/v1/me');
    expect(table).toHaveTextContent('/api/v1/files');
    expect(table).toHaveTextContent('/api/v1/shares');
    expect(table).toHaveTextContent('/api/v1/public/s/:token');
    expect(screen.queryByText(/\/api\/v1\/convert/)).not.toBeInTheDocument();
  });

  it('даёт примеры curl и fetch с polling 2 с и target_format', () => {
    renderWithRouter(<ApiDocsPage />);
    const curl = screen.getByRole('region', { name: 'Пример curl' });
    const fetchExample = screen.getByRole('region', { name: 'Пример fetch' });

    expect(curl).toHaveTextContent('/api/v1/jobs');
    expect(curl).toHaveTextContent('target_format=pdf');
    expect(curl).toHaveTextContent('X-API-Key');
    expect(fetchExample).toHaveTextContent("form.append('target_format', 'pdf')");
    expect(fetchExample).toHaveTextContent('setTimeout(resolve, 2000)');
    expect(fetchExample).toHaveTextContent('/download');
  });

  it('публикует коды ошибок HTTP + error.code', () => {
    renderWithRouter(<ApiDocsPage />);
    const table = screen.getByRole('table', { name: 'Ошибки' });

    expect(table).toHaveTextContent('413');
    expect(table).toHaveTextContent('file_too_large');
    expect(table).toHaveTextContent('401');
    expect(table).toHaveTextContent('unauthorized');
    expect(table).toHaveTextContent('429');
    expect(table).toHaveTextContent('rate_limited');
    expect(screen.getByRole('region', { name: 'Ошибки' })).toHaveTextContent('error.code');
  });

  it('перечисляет лимиты размера, таймаута и rate limit', () => {
    renderWithRouter(<ApiDocsPage />);
    const limits = screen.getByRole('region', { name: 'Лимиты v1' });

    expect(limits).toHaveTextContent('до 10 МБ');
    expect(limits).toHaveTextContent('60 секунд');
    expect(limits).toHaveTextContent('30 запросов / час / ключ');
  });

  it('ведёт гостя за ключом на регистрацию', () => {
    renderWithRouter(<ApiDocsPage />);

    expect(screen.getByRole('link', { name: 'Получить API-ключ' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('ведёт пользователя за ключом в личный кабинет', () => {
    useAuthStore.setState({
      user: { id: 'user-1', email: 'ivan@example.com', displayName: 'Иван' },
      status: 'authenticated',
    });
    renderWithRouter(<ApiDocsPage />);

    expect(screen.getByRole('link', { name: 'Получить API-ключ' })).toHaveAttribute(
      'href',
      '/account',
    );
  });
});
