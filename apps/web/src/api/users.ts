import { apiFetch, type ApiFetchOptions } from './http';
import { toAuthUser } from './auth';
import type { AuthUser, AuthUserDto } from '@/types/api';

export type PatchMeRequest = {
  displayName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  saveConversions?: boolean;
};

export const patchMeRequest = async (
  input: PatchMeRequest,
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<AuthUser> => {
  const body: Record<string, unknown> = {};
  if (input.displayName !== undefined) {
    body.display_name = input.displayName;
  }

  if (input.email !== undefined) {
    body.email = input.email;
  }

  if (input.currentPassword !== undefined) {
    body.current_password = input.currentPassword;
  }

  if (input.newPassword !== undefined) {
    body.new_password = input.newPassword;
  }

  if (input.saveConversions !== undefined) {
    body.save_conversions = input.saveConversions;
  }

  const dto = await apiFetch<AuthUserDto>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
    errorContext: 'account',
    notify: { sessionExpired: true },
    signal: options?.signal,
  });

  return toAuthUser(dto);
};
