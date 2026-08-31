import { TELEGRAM_BIND_PREFIX } from './telegram.constants';

const BIND_TOKEN_PATTERN = /^[0-9a-f]{48}$/i;

export const toBindStartParam = (bindToken: string): string =>
  `${TELEGRAM_BIND_PREFIX}${bindToken}`;

export const parseBindStartParam = (payload: string): string | null => {
  if (!payload.startsWith(TELEGRAM_BIND_PREFIX)) {
    return null;
  }

  const token = payload.slice(TELEGRAM_BIND_PREFIX.length);
  if (!BIND_TOKEN_PATTERN.test(token)) {
    return null;
  }

  return token;
};
