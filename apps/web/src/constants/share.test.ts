import { describe, expect, it } from 'vitest';
import { isUnavailableSharePreview } from '@/constants/share';

describe('isUnavailableSharePreview', () => {
  it('считает истёкшую ссылку недоступной', () => {
    expect(isUnavailableSharePreview('expired')).toBe(true);
  });

  it('считает отозванную ссылку недоступной', () => {
    expect(isUnavailableSharePreview('revoked')).toBe(true);
  });

  it('считает действующий token доступным', () => {
    expect(isUnavailableSharePreview('live-token')).toBe(false);
  });
});
