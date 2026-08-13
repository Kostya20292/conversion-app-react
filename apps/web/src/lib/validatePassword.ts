export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_HINT = `Не меньше ${PASSWORD_MIN_LENGTH} символов, буква и цифра`;

export type PasswordValidationResult = { ok: true } | { ok: false; message: string };

const hasLetter = (value: string): boolean => /\p{L}/u.test(value);
const hasDigit = (value: string): boolean => /\d/.test(value);

export const validatePassword = (password: string): PasswordValidationResult => {
  if (password.length === 0) {
    return { ok: false, message: 'Введите пароль' };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `Пароль должен содержать не меньше ${PASSWORD_MIN_LENGTH} символов`,
    };
  }

  if (!hasLetter(password)) {
    return { ok: false, message: 'Пароль должен содержать хотя бы одну букву' };
  }

  if (!hasDigit(password)) {
    return { ok: false, message: 'Пароль должен содержать хотя бы одну цифру' };
  }

  return { ok: true };
};

export const validatePasswordConfirmation = (
  password: string,
  confirmation: string,
): PasswordValidationResult => {
  if (confirmation.length === 0) {
    return { ok: false, message: 'Подтвердите пароль' };
  }

  if (password !== confirmation) {
    return { ok: false, message: 'Пароли не совпадают' };
  }

  return { ok: true };
};
