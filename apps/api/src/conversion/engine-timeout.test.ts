import { describe, expect, it } from 'vitest';
import { ENGINE_TIMEOUT_MS, withEngineTimeout } from './engine-timeout';

describe('withEngineTimeout (ТЗ §2.2 / план §8.4)', () => {
  it('uses a 60 second engine timeout', () => {
    expect(ENGINE_TIMEOUT_MS).toBe(60_000);
  });

  it('rejects with conversion_timeout when the operation exceeds the limit', async () => {
    await expect(withEngineTimeout(new Promise(() => undefined), 20)).rejects.toMatchObject({
      apiErrorCode: 'conversion_timeout',
    });
  });
});
