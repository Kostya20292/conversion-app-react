import { describe, expect, it } from 'vitest';
import { validateForgotPasswordForm, validateResetPasswordForm } from '@/features/auth/validateAuthForm';

describe('validateForgotPasswordForm', () => {
  it('требует email', () => {
    expect(validateForgotPasswordForm({ email: '' })).toEqual({
      email: 'Введите email',
    });
  });

  it('принимает корректный email', () => {
    expect(validateForgotPasswordForm({ email: 'user@example.com' })).toEqual({});
  });
});

describe('validateResetPasswordForm', () => {
  it('требует код восстановления', () => {
    const errors = validateResetPasswordForm({
      code: '',
      password: 'Abcdefg1',
      passwordConfirm: 'Abcdefg1',
    });

    expect(errors.code).toBe('Введите код');
  });

  it('проверяет правила нового пароля', () => {
    const errors = validateResetPasswordForm({
      code: '123456',
      password: '123',
      passwordConfirm: '123',
    });

    expect(errors.password).toBe('Пароль должен содержать не меньше 8 символов');
  });

  it('принимает код и валидный новый пароль', () => {
    expect(
      validateResetPasswordForm({
        code: '123456',
        password: 'Abcdefg1',
        passwordConfirm: 'Abcdefg1',
      }),
    ).toEqual({});
  });
});
