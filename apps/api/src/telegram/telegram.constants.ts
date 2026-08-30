export const TELEGRAM_BIND_TTL_MS = 15 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;
export const FORGOT_PASSWORD_COOLDOWN_MS = 60 * 1000;

export const NEUTRAL_FORGOT_MESSAGE =
  'If an account exists and Telegram is linked, a reset code has been sent';

export const INVALID_RESET_CODE_MESSAGE = 'Invalid reset code';
export const EXPIRED_RESET_CODE_MESSAGE = 'Reset code has expired';
