import type { ShareLinkItem } from '@/types/account';

export type AccountShareListProps = {
  shares: readonly ShareLinkItem[];
  onCopy: (share: ShareLinkItem) => void;
  onRevoke: (share: ShareLinkItem) => void;
};
