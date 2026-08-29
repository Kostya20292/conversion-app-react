import { describe, expect, it } from 'vitest';
import { createApiKey, maskApiKey, verifyApiKey } from './api-key-secret';

describe('API key secret (ТЗ §3.2 ApiKey / §7.7, план §5.5–5.6)', () => {
  it('issues a cv_live_ key whose stored prefix is shorter than the plaintext', async () => {
    const issued = await createApiKey();

    expect(issued.plaintext.startsWith('cv_live_')).toBe(true);
    expect(issued.prefix.startsWith('cv_live_')).toBe(true);
    expect(issued.prefix.length).toBeLessThan(issued.plaintext.length);
    expect(issued.plaintext.startsWith(issued.prefix)).toBe(true);
  });

  it('stores a hash that is not the plaintext and verifies the original key', async () => {
    const issued = await createApiKey();

    expect(issued.keyHash).not.toBe(issued.plaintext);
    expect(issued.keyHash.includes(issued.plaintext)).toBe(false);
    expect(await verifyApiKey(issued.keyHash, issued.plaintext)).toBe(true);
  });

  it('rejects a different plaintext against the stored hash', async () => {
    const issued = await createApiKey();
    const other = await createApiKey();

    expect(await verifyApiKey(issued.keyHash, other.plaintext)).toBe(false);
  });

  it('masks a key without revealing the secret suffix', async () => {
    const issued = await createApiKey();
    const masked = maskApiKey(issued.plaintext);
    const secretSuffix = issued.plaintext.slice(issued.prefix.length);

    expect(masked.startsWith('cv_live_')).toBe(true);
    expect(masked).not.toBe(issued.plaintext);
    expect(masked.includes(secretSuffix)).toBe(false);
  });
});
