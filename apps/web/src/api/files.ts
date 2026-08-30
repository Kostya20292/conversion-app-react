import { apiFetch, type ApiFetchOptions } from './http';
import type { StoredFileListDto } from '@/types/api';
import type { StoredFile } from '@/types/account';

const ACCOUNT_NOTIFY = { sessionExpired: true } as const;

export const toStoredFile = (dto: StoredFileListDto['files'][number]): StoredFile => ({
  id: dto.id,
  name: dto.name,
  format: dto.format,
  sizeBytes: dto.size_bytes,
  createdAt: dto.created_at,
  source: dto.source,
  downloadUrl: dto.download_url,
});

export const listFilesRequest = async (
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<StoredFile[]> => {
  const dto = await apiFetch<StoredFileListDto>('/api/files', {
    errorContext: 'account',
    notify: ACCOUNT_NOTIFY,
    signal: options?.signal,
  });

  return dto.files.map(toStoredFile);
};

export const deleteFileRequest = async (
  fileId: string,
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<void> => {
  await apiFetch<void>(`/api/files/${fileId}`, {
    method: 'DELETE',
    errorContext: 'account',
    notify: ACCOUNT_NOTIFY,
    signal: options?.signal,
  });
};
