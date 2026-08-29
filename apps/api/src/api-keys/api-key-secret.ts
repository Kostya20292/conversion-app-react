import { randomBytes } from 'node:crypto';
import { hash, verify } from 'argon2';

export const API_KEY_PLAINTEXT_PREFIX = 'cv_live_';
export const API_KEY_STORED_PREFIX_LENGTH = 16;

export type IssuedApiKey = {
  plaintext: string;
  prefix: string;
  keyHash: string;
};

export const getApiKeyPrefix = (plaintext: string): string =>
  plaintext.slice(0, API_KEY_STORED_PREFIX_LENGTH);

export const maskFromPrefix = (prefix: string): string => `${prefix}${'•'.repeat(12)}`;

export const maskApiKey = (plaintext: string): string => maskFromPrefix(getApiKeyPrefix(plaintext));

export const createApiKey = async (): Promise<IssuedApiKey> => {
  const plaintext = `${API_KEY_PLAINTEXT_PREFIX}${randomBytes(24).toString('hex')}`;
  const prefix = getApiKeyPrefix(plaintext);
  const keyHash = await hash(plaintext);

  return { plaintext, prefix, keyHash };
};

export const verifyApiKey = async (keyHash: string, plaintext: string): Promise<boolean> => {
  try {
    return await verify(keyHash, plaintext);
  } catch {
    return false;
  }
};
