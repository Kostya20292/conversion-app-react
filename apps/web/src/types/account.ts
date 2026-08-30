export type StoredFileSource = 'ui' | 'api';

export type StoredFile = {
  id: string;
  name: string;
  format: string;
  sizeBytes: number;
  createdAt: string;
  source: StoredFileSource;
  downloadUrl: string;
};

export type ShareLinkItem = {
  id: string;
  token: string;
  url: string;
  expiresAt: string;
  fileName: string;
};
