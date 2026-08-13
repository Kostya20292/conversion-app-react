export type EmailValidationResult =
  { ok: true; email: string } | { ok: false; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (email: string): EmailValidationResult => {
  const trimmed = email.trim();

  if (trimmed.length === 0) {
    return { ok: false, message: 'Введите email' };
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    return { ok: false, message: 'Введите корректный email' };
  }

  return { ok: true, email: trimmed };
};
