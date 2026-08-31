import { TELEGRAM_BIND_POLL_INTERVAL_MS, TELEGRAM_BIND_TIMEOUT_MS } from '@/constants/telegram';
import type { AuthUser } from '@/types/api';

export type PollTelegramBindResult = { ok: true; user: AuthUser } | { ok: false };

const wait = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);

    const handleAbort = () => {
      clearTimeout(timeoutId);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', handleAbort, { once: true });
  });

export const pollTelegramBind = async (input: {
  getUser: () => Promise<AuthUser>;
  signal?: AbortSignal;
}): Promise<PollTelegramBindResult> => {
  const startedAt = Date.now();

  while (true) {
    if (input.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const user = await input.getUser();
    if (user.telegramId) {
      return { ok: true, user };
    }

    const elapsed = Date.now() - startedAt;
    if (elapsed >= TELEGRAM_BIND_TIMEOUT_MS) {
      return { ok: false };
    }

    await wait(
      Math.min(TELEGRAM_BIND_POLL_INTERVAL_MS, TELEGRAM_BIND_TIMEOUT_MS - elapsed),
      input.signal,
    );
  }
};
