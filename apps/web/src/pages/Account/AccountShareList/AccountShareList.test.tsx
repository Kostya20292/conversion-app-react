import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccountShareList } from '@/pages/Account/AccountShareList/AccountShareList';
import { renderWithRouter } from '@/test/renderWithRouter';
import type { ShareLinkItem } from '@/types/account';

const sampleShare: ShareLinkItem = {
  id: '22222222-2222-4222-8222-222222222222',
  token: 'sharetoken',
  url: '/s/sharetoken',
  expiresAt: '2026-09-07T00:00:00.000Z',
  fileName: 'photo.png',
};

const noop = (): undefined => undefined;

describe('AccountShareList', () => {
  it('показывает «Показать ещё», пока есть следующая страница', async () => {
    const onLoadMore = vi.fn<() => void>();
    const { user } = renderWithRouter(
      <AccountShareList
        shares={[sampleShare]}
        hasMore
        onCopy={noop}
        onRevoke={noop}
        onLoadMore={onLoadMore}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Показать ещё' }));

    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('не показывает «Показать ещё», если страница последняя или список пуст', () => {
    const { rerender } = renderWithRouter(
      <AccountShareList
        shares={[sampleShare]}
        hasMore={false}
        onCopy={noop}
        onRevoke={noop}
        onLoadMore={noop}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Показать ещё' })).not.toBeInTheDocument();

    rerender(
      <AccountShareList shares={[]} hasMore onCopy={noop} onRevoke={noop} onLoadMore={noop} />,
    );

    expect(screen.queryByRole('button', { name: 'Показать ещё' })).not.toBeInTheDocument();
  });
});
