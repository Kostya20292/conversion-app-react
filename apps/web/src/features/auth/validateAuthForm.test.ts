import { describe, expect, it } from 'vitest';
import { validateLoginForm, validateRegisterForm } from './validateAuthForm';

describe('validateLoginForm', () => {
  it('требует email и пароль', () => {
    expect(validateLoginForm({ email: '', password: '' })).toEqual({
      email: 'Введите email',
      password: 'Введите пароль',
    });
  });

  it('на входе не проверяет сложность пароля', () => {
    expect(validateLoginForm({ email: 'user@example.com', password: '1' })).toEqual({});
  });
});

describe('validateRegisterForm', () => {
  it('отклоняет слабый пароль при регистрации', () => {
    const errors = validateRegisterForm({
      displayName: 'Иван',
      email: 'user@example.com',
      password: '123',
      passwordConfirm: '123',
    });

    expect(errors.password).toBe('Пароль должен содержать не меньше 8 символов');
  });

  it('отклоняет несовпадающее подтверждение пароля', () => {
    const errors = validateRegisterForm({
      displayName: 'Иван',
      email: 'user@example.com',
      password: 'Abcdefg1',
      passwordConfirm: 'Abcdefg2',
    });

    expect(errors.passwordConfirm).toBe('Пароли не совпадают');
  });

  it('принимает валидную форму регистрации', () => {
    expect(
      validateRegisterForm({
        displayName: 'Иван',
        email: 'user@example.com',
        password: 'Abcdefg1',
        passwordConfirm: 'Abcdefg1',
      }),
    ).toEqual({});
  });
});
