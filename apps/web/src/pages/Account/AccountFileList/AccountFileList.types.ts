import type { StoredFile } from '@/types/account';

export type AccountFileListProps = {
  files: readonly StoredFile[];
  hasMore: boolean;
  isLoadingMore?: boolean;
  onDownload: (file: StoredFile) => void;
  onShare: (file: StoredFile) => void;
  onDelete: (file: StoredFile) => void;
  onLoadMore: () => void;
};
