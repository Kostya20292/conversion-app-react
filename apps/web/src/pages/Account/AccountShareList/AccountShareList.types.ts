import type { ShareLinkItem } from '@/types/account';

export type AccountShareListProps = {
  shares: readonly ShareLinkItem[];
  hasMore: boolean;
  isLoadingMore?: boolean;
  onCopy: (share: ShareLinkItem) => void;
  onRevoke: (share: ShareLinkItem) => void;
  onLoadMore: () => void;
};
