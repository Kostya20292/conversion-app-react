const UNAVAILABLE_PREVIEW_TOKENS = new Set(['expired', 'revoked', 'gone']);
const AVAILABLE_PREVIEW_TOKENS = new Set(['live-token']);

export const isUnavailableSharePreview = (token: string | undefined): boolean => {
  if (!token) {
    return true;
  }

  return UNAVAILABLE_PREVIEW_TOKENS.has(token);
};

export const isAvailableSharePreview = (token: string | undefined): boolean =>
  Boolean(token && AVAILABLE_PREVIEW_TOKENS.has(token));
