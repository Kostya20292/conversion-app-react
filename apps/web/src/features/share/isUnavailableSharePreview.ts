const UNAVAILABLE_PREVIEW_TOKENS = new Set(['expired', 'revoked', 'gone']);

export const isUnavailableSharePreview = (token: string | undefined): boolean => {
  if (!token) {
    return true;
  }

  return UNAVAILABLE_PREVIEW_TOKENS.has(token);
};
