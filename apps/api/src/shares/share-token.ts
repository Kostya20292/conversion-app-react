import { randomBytes } from 'node:crypto';

export const SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_BYTES = 32;

export const createShareToken = (): string => randomBytes(TOKEN_BYTES).toString('base64url');
