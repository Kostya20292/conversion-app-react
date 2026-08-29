import type { User } from '@/users/user.entity';

export type AuthUserResponse = {
  id: string;
  email: string;
  display_name: string;
  save_conversions: boolean;
  telegram_id: string | null;
};

export type RegisterResponse = AuthUserResponse & {
  api_key: string;
};

export const toAuthUserResponse = (user: User): AuthUserResponse => ({
  id: user.id,
  email: user.email,
  display_name: user.displayName,
  save_conversions: user.saveConversions,
  telegram_id: user.telegramId,
});
