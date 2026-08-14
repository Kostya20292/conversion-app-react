import type { ShareFileMeta } from '@/types/share';

export type ShareAvailableCardProps = {
  file: ShareFileMeta;
  onDownload: () => void;
};
