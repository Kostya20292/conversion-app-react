import { apiFetch, type ApiFetchOptions } from './http';

export type TelegramBindResponse = {
  bind_token: string;
  start_param: string;
};

const TELEGRAM_NOTIFY = { sessionExpired: true } as const;

export const bindTelegramRequest = async (
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<TelegramBindResponse> =>
  apiFetch<TelegramBindResponse>('/api/users/me/telegram/bind', {
    method: 'POST',
    notify: TELEGRAM_NOTIFY,
    signal: options?.signal,
  });

export const confirmTelegramRequest = async (
  input: { bindToken: string; telegramId: string },
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<void> => {
  await apiFetch<void>('/api/telegram/mock/confirm', {
    method: 'POST',
    body: JSON.stringify({
      bind_token: input.bindToken,
      telegram_id: input.telegramId,
    }),
    notify: TELEGRAM_NOTIFY,
    signal: options?.signal,
  });
};

export const unbindTelegramRequest = async (
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<void> => {
  await apiFetch<void>('/api/users/me/telegram/unbind', {
    method: 'POST',
    notify: TELEGRAM_NOTIFY,
    signal: options?.signal,
  });
};
