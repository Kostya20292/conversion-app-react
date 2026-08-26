import { type ArgumentsHost, Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_MESSAGE_BY_ERROR_CODE } from './api-error-codes';
import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter', () => {
  it('writes { error: { code, message } } and never Nest stack in the body', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const json = vi.fn<(body: unknown) => void>();
    const status = vi.fn<(code: number) => { json: typeof json }>().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({}),
      }),
    } as ArgumentsHost;

    const filter = new ApiExceptionFilter();
    filter.catch(new Error('do-not-leak\n    at nest/core/router.ts:1:1'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'internal_error',
        message: DEFAULT_MESSAGE_BY_ERROR_CODE.internal_error,
      },
    });
    expect(JSON.stringify(json.mock.calls)).not.toContain('do-not-leak');
    expect(JSON.stringify(json.mock.calls)).not.toContain('router.ts');
  });
});
