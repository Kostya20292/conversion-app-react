import { createHash } from 'node:crypto';

export const hashResetCodeLookup = (code: string): string =>
  createHash('sha256').update(code, 'utf8').digest('hex');
