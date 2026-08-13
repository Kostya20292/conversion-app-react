import { validateDisplayName } from '@/features/auth/validateAuthForm';
import { validateEmail } from '@/lib/validateEmail';
import { validatePassword, validatePasswordConfirmation } from '@/lib/validatePassword';

export type AccountProfileFormValues = {
  displayName: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
};

export type AccountProfileFormErrors = Partial<Record<keyof AccountProfileFormValues, string>>;

export const ACCOUNT_PROFILE_FIELD_ORDER = [
  'displayName',
  'email',
  'currentPassword',
  'newPassword',
  'newPasswordConfirm',
] as const satisfies readonly (keyof AccountProfileFormValues)[];

export const validateAccountProfileForm = (
  values: AccountProfileFormValues,
  savedEmail: string,
): AccountProfileFormErrors => {
  const errors: AccountProfileFormErrors = {};
  const nameResult = validateDisplayName(values.displayName);
  const emailResult = validateEmail(values.email);

  if (!nameResult.ok) {
    errors.displayName = nameResult.message;
  }

  if (!emailResult.ok) {
    errors.email = emailResult.message;
  }

  const trimmedSavedEmail = savedEmail.trim();
  const emailChanged = trimmedSavedEmail.length > 0 && values.email.trim() !== trimmedSavedEmail;
  const wantsPasswordChange =
    values.newPassword.length > 0 || values.newPasswordConfirm.length > 0;

  if (emailChanged || wantsPasswordChange) {
    if (values.currentPassword.length === 0) {
      errors.currentPassword = 'Введите текущий пароль';
    }
  }

  if (wantsPasswordChange) {
    const passwordResult = validatePassword(values.newPassword);
    if (!passwordResult.ok) {
      errors.newPassword = passwordResult.message;
    }

    const confirmationResult = validatePasswordConfirmation(
      values.newPassword,
      values.newPasswordConfirm,
    );
    if (!confirmationResult.ok) {
      errors.newPasswordConfirm = confirmationResult.message;
    }
  }

  return errors;
};
