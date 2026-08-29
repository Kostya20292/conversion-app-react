import type { CookieOptions } from 'express';

export const AUTH_COOKIE_NAME = 'access_token';

export type CookieRequest = {
  cookies?: Record<string, string | undefined>;
  headers: {
    cookie?: string | string[];
  };
};

export const readAccessToken = (request: CookieRequest): string | undefined => {
  const fromCookies = request.cookies?.[AUTH_COOKIE_NAME];
  if (typeof fromCookies === 'string' && fromCookies.length > 0) {
    return fromCookies;
  }

  const header = request.headers.cookie;
  const cookieHeader = Array.isArray(header) ? header[0] : header;
  return readCookie(cookieHeader, AUTH_COOKIE_NAME);
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type AuthCookieParams = {
  rememberMe: boolean;
  isProduction: boolean;
};

export const createAuthCookieOptions = ({
  rememberMe,
  isProduction,
}: AuthCookieParams): CookieOptions => {
  const options: CookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: isProduction,
  };

  if (rememberMe) {
    options.maxAge = THIRTY_DAYS_MS;
  }

  return options;
};

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
