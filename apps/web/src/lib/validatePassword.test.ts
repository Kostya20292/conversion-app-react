import { describe, expect, it } from 'vitest';
import { validatePassword, validatePasswordConfirmation } from './validatePassword';

describe('validatePassword', () => {
  it('отклоняет пустой пароль', () => {
    expect(validatePassword('')).toEqual({
      ok: false,
      message: 'Введите пароль',
    });
  });

  it('отклоняет пароль короче 8 символов', () => {
    expect(validatePassword('Ab1')).toEqual({
      ok: false,
      message: 'Пароль должен содержать не меньше 8 символов',
    });
  });

  it('отклоняет пароль без буквы', () => {
    expect(validatePassword('12345678')).toEqual({
      ok: false,
      message: 'Пароль должен содержать хотя бы одну букву',
    });
  });

  it('отклоняет пароль без цифры', () => {
    expect(validatePassword('Abcdefgh')).toEqual({
      ok: false,
      message: 'Пароль должен содержать хотя бы одну цифру',
    });
  });

  it('принимает пароль из 8 символов с буквой и цифрой', () => {
    expect(validatePassword('Abcdefg1')).toEqual({ ok: true });
  });

  it('принимает пароль с кириллической буквой и цифрой', () => {
    expect(validatePassword('Пароль12')).toEqual({ ok: true });
  });
});

describe('validatePasswordConfirmation', () => {
  it('требует подтверждение пароля', () => {
    expect(validatePasswordConfirmation('Abcdefg1', '')).toEqual({
      ok: false,
      message: 'Подтвердите пароль',
    });
  });

  it('отклоняет несовпадающее подтверждение', () => {
    expect(validatePasswordConfirmation('Abcdefg1', 'Abcdefg2')).toEqual({
      ok: false,
      message: 'Пароли не совпадают',
    });
  });

  it('принимает совпадающее подтверждение', () => {
    expect(validatePasswordConfirmation('Abcdefg1', 'Abcdefg1')).toEqual({ ok: true });
  });
});
