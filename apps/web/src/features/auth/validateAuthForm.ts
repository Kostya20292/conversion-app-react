import { validateEmail } from '@/lib/validateEmail';
import { validatePassword, validatePasswordConfirmation } from '@/lib/validatePassword';

export type LoginFormValues = {
  email: string;
  password: string;
};

export type RegisterFormValues = {
  displayName: string;
  email: string;
  password: string;
  passwordConfirm: string;
};

export type ForgotPasswordFormValues = {
  email: string;
};

export type ResetPasswordFormValues = {
  code: string;
  password: string;
  passwordConfirm: string;
};

export type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;
export type RegisterFormErrors = Partial<Record<keyof RegisterFormValues, string>>;
export type ForgotPasswordFormErrors = Partial<Record<keyof ForgotPasswordFormValues, string>>;
export type ResetPasswordFormErrors = Partial<Record<keyof ResetPasswordFormValues, string>>;

export const LOGIN_FIELD_ORDER = [
  'email',
  'password',
] as const satisfies readonly (keyof LoginFormValues)[];

export const REGISTER_FIELD_ORDER = [
  'displayName',
  'email',
  'password',
  'passwordConfirm',
] as const satisfies readonly (keyof RegisterFormValues)[];

export const FORGOT_PASSWORD_FIELD_ORDER = [
  'email',
] as const satisfies readonly (keyof ForgotPasswordFormValues)[];

export const RESET_PASSWORD_FIELD_ORDER = [
  'code',
  'password',
  'passwordConfirm',
] as const satisfies readonly (keyof ResetPasswordFormValues)[];

export const validateDisplayName = (
  displayName: string,
): { ok: true } | { ok: false; message: string } => {
  if (displayName.trim().length === 0) {
    return { ok: false, message: 'Введите имя' };
  }

  return { ok: true };
};

export const validateLoginForm = (values: LoginFormValues): LoginFormErrors => {
  const errors: LoginFormErrors = {};
  const emailResult = validateEmail(values.email);

  if (!emailResult.ok) {
    errors.email = emailResult.message;
  }

  if (values.password.length === 0) {
    errors.password = 'Введите пароль';
  }

  return errors;
};

export const validateRegisterForm = (values: RegisterFormValues): RegisterFormErrors => {
  const errors: RegisterFormErrors = {};
  const nameResult = validateDisplayName(values.displayName);
  const emailResult = validateEmail(values.email);
  const passwordResult = validatePassword(values.password);
  const confirmationResult = validatePasswordConfirmation(values.password, values.passwordConfirm);

  if (!nameResult.ok) {
    errors.displayName = nameResult.message;
  }

  if (!emailResult.ok) {
    errors.email = emailResult.message;
  }

  if (!passwordResult.ok) {
    errors.password = passwordResult.message;
  }

  if (!confirmationResult.ok) {
    errors.passwordConfirm = confirmationResult.message;
  }

  return errors;
};

export const validateResetCode = (code: string): { ok: true } | { ok: false; message: string } => {
  if (code.trim().length === 0) {
    return { ok: false, message: 'Введите код' };
  }

  return { ok: true };
};

export const validateForgotPasswordForm = (
  values: ForgotPasswordFormValues,
): ForgotPasswordFormErrors => {
  const errors: ForgotPasswordFormErrors = {};
  const emailResult = validateEmail(values.email);

  if (!emailResult.ok) {
    errors.email = emailResult.message;
  }

  return errors;
};

export const validateResetPasswordForm = (
  values: ResetPasswordFormValues,
): ResetPasswordFormErrors => {
  const errors: ResetPasswordFormErrors = {};
  const codeResult = validateResetCode(values.code);
  const passwordResult = validatePassword(values.password);
  const confirmationResult = validatePasswordConfirmation(values.password, values.passwordConfirm);

  if (!codeResult.ok) {
    errors.code = codeResult.message;
  }

  if (!passwordResult.ok) {
    errors.password = passwordResult.message;
  }

  if (!confirmationResult.ok) {
    errors.passwordConfirm = confirmationResult.message;
  }

  return errors;
};

export const getFirstErrorField = <T extends string>(
  errors: Partial<Record<T, string>>,
  order: readonly T[],
): T | undefined => order.find((field) => Boolean(errors[field]));
