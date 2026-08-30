export type JobStatusPhase = 'uploading' | 'processing' | 'completed' | 'failed';

export type JobStatusProps = {
  phase: JobStatusPhase;
  error: string | null;
  downloadError?: string | null;
  isSharing?: boolean;
  shareUrl?: string | null;
  shareError?: string | null;
  onDownload: () => void;
  onShare: () => void;
  onRetry: () => void;
};
