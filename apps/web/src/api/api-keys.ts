import { apiFetch, type ApiFetchOptions } from './http';

export type ApiKeyListItem = {
  prefix: string;
  masked_key: string;
  created_at: string;
};

export type ApiKeyListResponse = {
  keys: ApiKeyListItem[];
};

export type ApiKeyPlaintextResponse = {
  api_key: string;
};

export const listApiKeysRequest = async (
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<ApiKeyListResponse> =>
  apiFetch<ApiKeyListResponse>('/api/api-keys', {
    signal: options?.signal,
    notify: { sessionExpired: true },
  });

export const reissueApiKeyRequest = async (
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<ApiKeyPlaintextResponse> =>
  apiFetch<ApiKeyPlaintextResponse>('/api/api-keys/reissue', {
    method: 'POST',
    signal: options?.signal,
    notify: { sessionExpired: true },
  });
