import { describe, expect, it } from 'vitest';
import { maskApiKey } from './maskApiKey';

describe('maskApiKey', () => {
  it('не показывает полный ключ, оставляя префикс cv_live_', () => {
    const masked = maskApiKey('cv_live_secretsecret');

    expect(masked.startsWith('cv_live_')).toBe(true);
    expect(masked).not.toContain('secret');
  });
});
