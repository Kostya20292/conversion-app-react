import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SharePage } from './SharePage';

const renderSharePage = (token: string) =>
  render(
    <MemoryRouter initialEntries={[`/s/${token}`]}>
      <Routes>
        <Route path="/s/:token" element={<SharePage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('SharePage', () => {
  it('показывает, что истёкшая ссылка больше недоступна', () => {
    renderSharePage('expired');

    expect(screen.getByRole('heading', { name: 'Ссылка больше недоступна' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Сконвертировать свой файл' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('для действующей ссылки не требует вход', () => {
    renderSharePage('live-token');

    expect(screen.getByText('Файл доступен по ссылке. Вход не нужен.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Скачать/ })).toBeInTheDocument();
  });
});
