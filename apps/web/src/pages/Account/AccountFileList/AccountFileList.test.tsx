import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AccountFileList } from '@/pages/Account/AccountFileList/AccountFileList';
import { renderWithRouter } from '@/test/renderWithRouter';
import type { StoredFile } from '@/types/account';

const sampleFile: StoredFile = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'photo.png',
  format: 'png',
  sizeBytes: 12,
  createdAt: '2026-08-31T00:00:00.000Z',
  source: 'ui',
  downloadUrl: '/api/files/x/download?token=t',
};

const noop = (): undefined => undefined;

describe('AccountFileList', () => {
  it('показывает «Показать ещё», пока есть следующая страница', async () => {
    const onLoadMore = vi.fn<() => void>();
    const { user } = renderWithRouter(
      <AccountFileList
        files={[sampleFile]}
        hasMore
        onDownload={noop}
        onShare={noop}
        onDelete={noop}
        onLoadMore={onLoadMore}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Показать ещё' }));

    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('не показывает «Показать ещё», если страница последняя или список пуст', () => {
    const { rerender } = renderWithRouter(
      <AccountFileList
        files={[sampleFile]}
        hasMore={false}
        onDownload={noop}
        onShare={noop}
        onDelete={noop}
        onLoadMore={noop}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Показать ещё' })).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AccountFileList
          files={[]}
          hasMore
          onDownload={noop}
          onShare={noop}
          onDelete={noop}
          onLoadMore={noop}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: 'Показать ещё' })).not.toBeInTheDocument();
  });
});
