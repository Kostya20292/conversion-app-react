import { StreamableFile } from '@nestjs/common';
import { FILE_FORMATS, type FileFormat } from '@/common/domain/file-format';
import { ApiException } from '@/common/errors/api-exception';
import type { ShareLink } from './share-link.entity';

export type ShareCreatedResponse = {
  token: string;
  url: string;
  expires_at: string;
};

export type SharePublicResponse = {
  name: string;
  format: FileFormat;
  size_bytes: number;
  expires_at: string;
  download_url: string;
};

export type ShareListItem = {
  id: string;
  url: string;
  expires_at: string;
  file_name: string;
};

export type ShareListResponse = {
  shares: ShareListItem[];
};

export type ShareDownload = {
  bytes: Buffer;
  mimeType: string;
  filename: string;
};

export const sharePageUrl = (token: string): string => `/s/${token}`;

export const sharePublicDownloadUrl = (token: string): string =>
  `/api/v1/public/s/${token}/download`;

export const jobResultFileName = (format: FileFormat): string => `result.${format}`;

export const toShareCreatedResponse = (share: ShareLink): ShareCreatedResponse => ({
  token: share.token,
  url: sharePageUrl(share.token),
  expires_at: share.expiresAt.toISOString(),
});

export const formatFromFileName = (name: string): FileFormat => {
  const separator = name.lastIndexOf('.');
  const ext = separator >= 0 ? name.slice(separator + 1).toLowerCase() : '';
  const format = ext === 'jpeg' ? 'jpg' : ext;
  if (!isFileFormat(format)) {
    throw new ApiException('internal_error');
  }

  return format;
};

export const toSharePublicResponse = (
  share: ShareLink,
  payload: { name: string; format: FileFormat; sizeBytes: number },
): SharePublicResponse => ({
  name: payload.name,
  format: payload.format,
  size_bytes: payload.sizeBytes,
  expires_at: share.expiresAt.toISOString(),
  download_url: sharePublicDownloadUrl(share.token),
});

export const toShareListItem = (share: ShareLink): ShareListItem => ({
  id: share.id,
  url: sharePageUrl(share.token),
  expires_at: share.expiresAt.toISOString(),
  file_name: fileNameFromShare(share),
});

export const toShareFileStream = (file: ShareDownload): StreamableFile =>
  new StreamableFile(file.bytes, {
    type: file.mimeType,
    disposition: `attachment; filename="${file.filename}"`,
  });

export const fileNameFromShare = (share: ShareLink): string => {
  if (share.file) {
    return share.file.name;
  }

  if (share.job) {
    return jobResultFileName(share.job.targetFormat);
  }

  return '';
};

export const publicPayloadFromShare = (
  share: ShareLink,
): { name: string; format: FileFormat; sizeBytes: number; storageKey: string } => {
  if (share.file) {
    return {
      name: share.file.name,
      format: formatFromFileName(share.file.name),
      sizeBytes: share.file.size,
      storageKey: share.file.storageKey,
    };
  }

  if (share.job && share.job.resultStorageKey !== null && share.job.resultSize !== null) {
    return {
      name: jobResultFileName(share.job.targetFormat),
      format: share.job.targetFormat,
      sizeBytes: share.job.resultSize,
      storageKey: share.job.resultStorageKey,
    };
  }

  throw new ApiException('gone');
};

const isFileFormat = (value: string): value is FileFormat =>
  (FILE_FORMATS as readonly string[]).includes(value);
