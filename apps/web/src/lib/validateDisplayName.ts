export type DisplayNameValidationResult = { ok: true } | { ok: false; message: string };

export const validateDisplayName = (displayName: string): DisplayNameValidationResult => {
  if (displayName.trim().length === 0) {
    return { ok: false, message: 'Введите имя' };
  }

  return { ok: true };
};
