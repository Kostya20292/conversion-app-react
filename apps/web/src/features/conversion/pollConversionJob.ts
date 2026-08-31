import type { ApiErrorCode, ConversionJob } from '@/types/api';

export const JOB_POLL_INTERVAL_MS = 2_000;
export const CONVERSION_TIMEOUT_MS = 60_000;

export type PollConversionJobResult =
  { ok: true; job: ConversionJob } | { ok: false; code: ApiErrorCode };

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

export const pollConversionJob = async (input: {
  getJob: () => Promise<ConversionJob>;
  signal?: AbortSignal;
}): Promise<PollConversionJobResult> => {
  const startedAt = Date.now();

  while (true) {
    if (input.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const job = await input.getJob();

    if (job.status === 'completed') {
      return { ok: true, job };
    }

    if (job.status === 'failed') {
      return { ok: false, code: job.error?.code ?? 'conversion_failed' };
    }

    const elapsed = Date.now() - startedAt;
    if (elapsed >= CONVERSION_TIMEOUT_MS) {
      return { ok: false, code: 'conversion_timeout' };
    }

    await wait(Math.min(JOB_POLL_INTERVAL_MS, CONVERSION_TIMEOUT_MS - elapsed), input.signal);
  }
};
