import { type ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  type ApiKeyAuthenticator,
  RejectAllApiKeyAuthenticator,
} from '@/common/api-key.authenticator';
import { ApiKeyGuard } from './api-key.guard';

const createContext = (headers: Record<string, string | string[] | undefined>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  }) as ExecutionContext;

describe('ApiKeyGuard', () => {
  it('rejects a missing X-API-Key as unauthorized', async () => {
    const guard = new ApiKeyGuard(new RejectAllApiKeyAuthenticator());

    await expect(guard.canActivate(createContext({}))).rejects.toMatchObject({
      apiErrorCode: 'unauthorized',
    });
  });

  it('rejects an unknown API key as unauthorized', async () => {
    const guard = new ApiKeyGuard(new RejectAllApiKeyAuthenticator());

    await expect(
      guard.canActivate(createContext({ 'x-api-key': 'cv_live_unknown' })),
    ).rejects.toMatchObject({ apiErrorCode: 'unauthorized' });
  });

  it('accepts a recognized API key', async () => {
    const authenticator: ApiKeyAuthenticator = {
      authenticate: async () => ({ id: 'key-1', userId: 'user-1' }),
    };
    const guard = new ApiKeyGuard(authenticator);
    const request = { headers: { 'x-api-key': 'cv_live_valid' } };

    const allowed = await guard.canActivate({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext);

    expect(allowed).toBe(true);
    expect(request).toMatchObject({ apiKey: { id: 'key-1', userId: 'user-1' } });
  });
});
