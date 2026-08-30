import { afterEach, describe, expect, it, vi } from 'vitest';
import { pollConversionJob } from '@/features/conversion/pollConversionJob';

describe('pollConversionJob', () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('запрашивает статус каждые 2 секунды, пока job в queued или processing', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const getJob = async () => {
      calls += 1;
      return { id: '1', status: 'queued' as const };
    };

    const pending = pollConversionJob({ getJob });
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toBe(1);

    await vi.advanceTimersByTimeAsync(1999);
    expect(calls).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toBe(2);

    pending.catch(() => undefined);
  });

  it('останавливает опрос на completed и возвращает download_url', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const getJob = async () => {
      calls += 1;
      if (calls === 1) {
        return { id: '1', status: 'processing' as const };
      }
      return {
        id: '1',
        status: 'completed' as const,
        download_url: '/api/jobs/1/download?token=abc',
      };
    };

    const resultPromise = pollConversionJob({ getJob });
    await vi.runAllTimersAsync();

    expect(await resultPromise).toEqual({
      ok: true,
      job: {
        id: '1',
        status: 'completed',
        download_url: '/api/jobs/1/download?token=abc',
      },
    });
    expect(calls).toBe(2);
  });

  it('останавливает опрос, когда job failed', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const getJob = async () => {
      calls += 1;
      return { id: '1', status: 'failed' as const, error: { code: 'conversion_failed' as const } };
    };

    const resultPromise = pollConversionJob({ getJob });
    await vi.runAllTimersAsync();
    await resultPromise;

    await vi.advanceTimersByTimeAsync(10_000);
    expect(calls).toBe(1);
  });

  it('после 60 секунд в queued или processing считает конвертацию просроченной', async () => {
    vi.useFakeTimers();
    const getJob = async () => ({ id: '1', status: 'processing' as const });

    const resultPromise = pollConversionJob({ getJob });
    await vi.advanceTimersByTimeAsync(60_000);

    expect(await resultPromise).toEqual({ ok: false, code: 'conversion_timeout' });
  });
});
