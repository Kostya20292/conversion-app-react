import { describe, expect, it } from 'vitest';
import { isPasswordValid } from './password-policy';

describe('password policy (ТЗ §6.2 / §13 #17)', () => {
  it('rejects a password shorter than 8 characters', () => {
    expect(isPasswordValid('Abcdef1')).toBe(false);
  });

  it('rejects a password without a letter', () => {
    expect(isPasswordValid('12345678')).toBe(false);
  });

  it('rejects a password without a digit', () => {
    expect(isPasswordValid('abcdefgh')).toBe(false);
  });

  it('accepts a password with 8+ characters, a letter and a digit', () => {
    expect(isPasswordValid('Abcdefg1')).toBe(true);
  });

  it('counts a Unicode letter as the required letter', () => {
    expect(isPasswordValid('Пароль12')).toBe(true);
  });
});
