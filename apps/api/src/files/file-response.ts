import { StreamableFile } from '@nestjs/common';
import type { RequestSource } from '@/common/domain/request-source';
import { FILE_FORMATS, type FileFormat } from '@/common/domain/file-format';
import { ApiException } from '@/common/errors/api-exception';
import { contentDispositionAttachment } from '@/common/result-file-name';
import type { StoredFile } from './stored-file.entity';

export type FileListItem = {
  id: string;
  name: string;
  format: FileFormat;
  size_bytes: number;
  created_at: string;
  source: RequestSource;
  download_url: string;
};

export type FileListResponse = {
  files: FileListItem[];
  next_cursor: string | null;
};

export type FileDownload = {
  bytes: Buffer;
  mimeType: string;
  filename: string;
};

export type FileDownloadChannel = 'ui' | 'api';

export const formatFromStoredName = (name: string): FileFormat => {
  const separator = name.lastIndexOf('.');
  const ext = separator >= 0 ? name.slice(separator + 1).toLowerCase() : '';
  const format = ext === 'jpeg' ? 'jpg' : ext;
  if (!isFileFormat(format)) {
    throw new ApiException('internal_error');
  }

  return format;
};

export const toFileListItem = (file: StoredFile, downloadUrl: string): FileListItem => ({
  id: file.id,
  name: file.name,
  format: formatFromStoredName(file.name),
  size_bytes: file.size,
  created_at: file.createdAt.toISOString(),
  source: file.source,
  download_url: downloadUrl,
});

export const uiFileDownloadUrl = (fileId: string, token: string): string =>
  `/api/files/${fileId}/download?token=${encodeURIComponent(token)}`;

export const v1FileDownloadUrl = (fileId: string): string => `/api/v1/files/${fileId}/download`;

export const toFileStream = (file: FileDownload): StreamableFile =>
  new StreamableFile(file.bytes, {
    type: file.mimeType,
    disposition: contentDispositionAttachment(file.filename),
  });

const isFileFormat = (value: string): value is FileFormat =>
  (FILE_FORMATS as readonly string[]).includes(value);
