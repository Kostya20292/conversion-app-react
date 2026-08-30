export type JobStatusPhase = 'uploading' | 'processing' | 'completed' | 'failed';

export type JobStatusProps = {
  phase: JobStatusPhase;
  error: string | null;
  onDownload: () => void;
  onShare: () => void;
  onRetry: () => void;
};
