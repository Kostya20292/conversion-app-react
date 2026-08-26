export const AUTH_COOKIE_NAME = 'access_token';

export const readCookie = (cookieHeader: string | undefined, name: string): string | undefined => {
  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = cookie.slice(0, separatorIndex).trim();
    if (key !== name) {
      continue;
    }

    return decodeURIComponent(cookie.slice(separatorIndex + 1).trim());
  }

  return undefined;
};
