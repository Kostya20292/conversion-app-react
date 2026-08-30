import { apiFetch, type ApiFetchOptions } from './http';
import type { ShareCreatedDto, SharePublicDto } from '@/types/api';
import type { ShareFileMeta } from '@/types/share';

export type CreateShareRequest = {
  jobId: string;
};

export const toShareFileMeta = (dto: SharePublicDto): ShareFileMeta => ({
  name: dto.name,
  format: dto.format.toUpperCase(),
  sizeBytes: dto.size_bytes,
  expiresAt: dto.expires_at,
});

export const createShareRequest = async (
  input: CreateShareRequest,
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<ShareCreatedDto> =>
  apiFetch<ShareCreatedDto>('/api/shares', {
    method: 'POST',
    body: JSON.stringify({ job_id: input.jobId }),
    errorContext: 'share',
    signal: options?.signal,
  });

export const getPublicShareRequest = async (
  token: string,
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<SharePublicDto> =>
  apiFetch<SharePublicDto>(`/api/v1/public/s/${encodeURIComponent(token)}`, {
    errorContext: 'share',
    notify: { sessionExpired: false, serverError: false },
    signal: options?.signal,
  });
