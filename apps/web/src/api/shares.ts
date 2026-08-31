import { apiFetch, type ApiFetchOptions } from './http';
import type { ShareCreatedDto, ShareListDto, SharePublicDto } from '@/types/api';
import type { ShareLinkItem } from '@/types/account';
import type { ShareFileMeta } from '@/types/share';

export type CreateShareRequest = {
  jobId?: string;
  fileId?: string;
};

const SHARE_PAGE_PREFIX = '/s/';

export const toShareFileMeta = (dto: SharePublicDto): ShareFileMeta => ({
  name: dto.name,
  format: dto.format.toUpperCase(),
  sizeBytes: dto.size_bytes,
  expiresAt: dto.expires_at,
});

export const toShareLinkItem = (dto: ShareListDto['shares'][number]): ShareLinkItem => ({
  id: dto.id,
  token: tokenFromShareUrl(dto.url),
  url: dto.url,
  expiresAt: dto.expires_at,
  fileName: dto.file_name,
});

export const createShareRequest = async (
  input: CreateShareRequest,
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<ShareCreatedDto> => {
  const body: Record<string, string> = {};
  if (input.jobId) {
    body.job_id = input.jobId;
  }

  if (input.fileId) {
    body.file_id = input.fileId;
  }

  return apiFetch<ShareCreatedDto>('/api/shares', {
    method: 'POST',
    body: JSON.stringify(body),
    errorContext: 'share',
    notify: { sessionExpired: true },
    signal: options?.signal,
  });
};

export type ShareListPage = {
  shares: ShareLinkItem[];
  nextCursor: string | null;
};

export const listSharesRequest = async (
  options?: Pick<ApiFetchOptions, 'signal'> & { cursor?: string },
): Promise<ShareListPage> => {
  const path =
    options?.cursor !== undefined && options.cursor.length > 0
      ? `/api/shares?cursor=${encodeURIComponent(options.cursor)}`
      : '/api/shares';
  const dto = await apiFetch<ShareListDto>(path, {
    errorContext: 'account',
    notify: { sessionExpired: true },
    signal: options?.signal,
  });

  return {
    shares: dto.shares.map(toShareLinkItem),
    nextCursor: dto.next_cursor,
  };
};

export const revokeShareRequest = async (
  token: string,
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<void> => {
  await apiFetch<void>(`/api/shares/${encodeURIComponent(token)}`, {
    method: 'DELETE',
    errorContext: 'share',
    notify: { sessionExpired: true },
    signal: options?.signal,
  });
};

export const getPublicShareRequest = async (
  token: string,
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<SharePublicDto> =>
  apiFetch<SharePublicDto>(`/api/v1/public/s/${encodeURIComponent(token)}`, {
    errorContext: 'share',
    notify: { sessionExpired: false, serverError: false, network: false },
    signal: options?.signal,
  });

const tokenFromShareUrl = (url: string): string =>
  url.startsWith(SHARE_PAGE_PREFIX) ? url.slice(SHARE_PAGE_PREFIX.length) : url;
