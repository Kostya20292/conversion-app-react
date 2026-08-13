export type StoredFileSource = 'ui' | 'api';

export type StoredFile = {
  id: string;
  name: string;
  format: string;
  sizeBytes: number;
  createdAt: string;
  source: StoredFileSource;
};

export type ShareLinkItem = {
  id: string;
  url: string;
  expiresAt: string;
  fileName: string;
};
