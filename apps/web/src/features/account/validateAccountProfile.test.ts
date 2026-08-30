import { describe, expect, it } from 'vitest';
import { validateAccountProfileForm } from '@/features/account/validateAccountProfile';

const validProfile = {
  displayName: 'Иван',
  email: 'user@example.com',
  currentPassword: '',
  newPassword: '',
  newPasswordConfirm: '',
};

describe('validateAccountProfileForm', () => {
  it('требует текущий пароль при смене email', () => {
    const errors = validateAccountProfileForm(
      { ...validProfile, email: 'new@example.com' },
      'user@example.com',
    );

    expect(errors.currentPassword).toBe('Введите текущий пароль');
  });

  it('проверяет правила нового пароля', () => {
    const errors = validateAccountProfileForm(
      {
        ...validProfile,
        currentPassword: 'Oldpass1',
        newPassword: '123',
        newPasswordConfirm: '123',
      },
      'user@example.com',
    );

    expect(errors.newPassword).toBe('Пароль должен содержать не меньше 8 символов');
  });

  it('не требует текущий пароль, если меняется только имя', () => {
    const errors = validateAccountProfileForm(
      { ...validProfile, displayName: 'Пётр' },
      'user@example.com',
    );

    expect(errors).toEqual({});
  });
});
