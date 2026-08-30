import { ApiException } from '@/common/errors/api-exception';

export const ENGINE_TIMEOUT_MS = 60_000;

export const withEngineTimeout = async <T>(
  operation: Promise<T>,
  timeoutMs: number = ENGINE_TIMEOUT_MS,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new ApiException('conversion_timeout'));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
};
