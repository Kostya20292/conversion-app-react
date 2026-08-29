import { apiFetch, type ApiFetchOptions } from './http';
import type { AuthUser, AuthUserDto, RegisterDto } from '@/types/api';

export type LoginRequest = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export type RegisterRequest = {
  displayName: string;
  email: string;
  password: string;
};

export type RegisterResult = {
  user: AuthUser;
  apiKey: string;
};

const AUTH_NOTIFY = {
  sessionExpired: false,
  rateLimited: false,
  serverError: true,
} as const;

const toAuthUser = (dto: AuthUserDto): AuthUser => ({
  id: dto.id,
  email: dto.email,
  displayName: dto.display_name,
  saveConversions: dto.save_conversions,
  telegramId: dto.telegram_id,
});

export const loginRequest = async (
  input: LoginRequest,
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<AuthUser> => {
  const dto = await apiFetch<AuthUserDto>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      remember_me: input.rememberMe,
    }),
    errorContext: 'login',
    notify: AUTH_NOTIFY,
    signal: options?.signal,
  });

  return toAuthUser(dto);
};

export const registerRequest = async (
  input: RegisterRequest,
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<RegisterResult> => {
  const dto = await apiFetch<RegisterDto>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      display_name: input.displayName,
      email: input.email,
      password: input.password,
    }),
    errorContext: 'register',
    notify: AUTH_NOTIFY,
    signal: options?.signal,
  });

  return { user: toAuthUser(dto), apiKey: dto.api_key };
};

export const getMeRequest = async (options?: Pick<ApiFetchOptions, 'signal'>): Promise<AuthUser> => {
  const dto = await apiFetch<AuthUserDto>('/api/auth/me', {
    notify: { sessionExpired: false, rateLimited: false, serverError: false },
    signal: options?.signal,
  });

  return toAuthUser(dto);
};

export const logoutRequest = async (options?: Pick<ApiFetchOptions, 'signal'>): Promise<void> => {
  await apiFetch<void>('/api/auth/logout', {
    method: 'POST',
    notify: { sessionExpired: false, rateLimited: false, serverError: true },
    signal: options?.signal,
  });
};
