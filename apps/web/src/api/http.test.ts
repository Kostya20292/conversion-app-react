import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError, apiDownload } from '@/api/http';

describe('apiDownload', () => {
  it('для просроченного файла показывает, что срок хранения истёк', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'gone', message: 'The resource is no longer available' },
        }),
        {
          status: 410,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    try {
      await expect(
        apiDownload('/api/jobs/1/download?token=expired', { errorContext: 'download' }),
      ).rejects.toMatchObject({
        name: ApiRequestError.name,
        userMessage: 'Файл больше недоступен (истёк срок хранения)',
      });
    } finally {
      fetchMock.mockRestore();
    }
  });
});
