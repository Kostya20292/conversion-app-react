import { afterEach, describe, expect, it, vi } from 'vitest';
import { pollTelegramBind } from '@/features/account/pollTelegramBind';
import type { AuthUser } from '@/types/api';

const unboundUser: AuthUser = {
  id: '1',
  email: 'a@b.c',
  displayName: 'A',
  telegramId: null,
};

describe('pollTelegramBind', () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('опрашивает профиль каждые 2 секунды, пока telegram_id пустой', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const getUser = async () => {
      calls += 1;
      return unboundUser;
    };

    const pending = pollTelegramBind({ getUser });
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toBe(1);

    await vi.advanceTimersByTimeAsync(1999);
    expect(calls).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toBe(2);

    pending.catch(() => undefined);
  });

  it('останавливает опрос, когда в профиле появляется telegram_id', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const getUser = async (): Promise<AuthUser> => {
      calls += 1;
      if (calls === 1) {
        return unboundUser;
      }

      return { ...unboundUser, telegramId: '123' };
    };

    const resultPromise = pollTelegramBind({ getUser });
    await vi.runAllTimersAsync();

    expect(await resultPromise).toEqual({
      ok: true,
      user: { ...unboundUser, telegramId: '123' },
    });
    expect(calls).toBe(2);
  });
});
