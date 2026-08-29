const AUTH_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password'];

export const getSafeNextPath = (next: string | null | undefined, fallback = '/account'): string => {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('://')) {
    return fallback;
  }

  if (AUTH_PREFIXES.some((prefix) => next === prefix || next.startsWith(`${prefix}?`))) {
    return fallback;
  }

  return next;
};
