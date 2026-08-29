import { apiFetch, type ApiFetchOptions } from './http';

export type ApiKeyListItem = {
  prefix: string;
  masked_key: string;
  created_at: string;
};

export type ApiKeyListResponse = {
  keys: ApiKeyListItem[];
};

export const listApiKeysRequest = async (
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<ApiKeyListResponse> =>
  apiFetch<ApiKeyListResponse>('/api/api-keys', {
    signal: options?.signal,
    notify: { sessionExpired: true },
  });
