import { describe, expect, it } from 'vitest';
import { User } from './user.entity';

describe('User (ТЗ §3.2)', () => {
  it('defaults save_conversions to false', () => {
    expect(new User().saveConversions).toBe(false);
  });
});
