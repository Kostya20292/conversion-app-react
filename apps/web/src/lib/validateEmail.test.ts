import { describe, expect, it } from 'vitest';
import { validateEmail } from '@/lib/validateEmail';

describe('validateEmail', () => {
  it('отклоняет пустой email', () => {
    expect(validateEmail('')).toEqual({
      ok: false,
      message: 'Введите email',
    });
  });

  it('отклоняет некорректный email', () => {
    expect(validateEmail('not-an-email')).toEqual({
      ok: false,
      message: 'Введите корректный email',
    });
  });

  it('принимает корректный email', () => {
    expect(validateEmail('user@example.com')).toEqual({
      ok: true,
      email: 'user@example.com',
    });
  });
});
