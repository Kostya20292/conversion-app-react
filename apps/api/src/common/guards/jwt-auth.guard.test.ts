import { type ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from 'vitest';
import { AUTH_COOKIE_NAME } from '@/common/auth-cookie';
import { JwtAuthGuard } from './jwt-auth.guard';

const jwtService = new JwtService({ secret: 'test-jwt-secret' });
const guard = new JwtAuthGuard(jwtService);

const createContext = (request: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as ExecutionContext;

describe('JwtAuthGuard', () => {
  it('rejects a request without a session cookie as unauthorized', async () => {
    await expect(guard.canActivate(createContext({ headers: {} }))).rejects.toMatchObject({
      apiErrorCode: 'unauthorized',
    });
  });

  it('rejects an invalid JWT cookie as unauthorized', async () => {
    await expect(
      guard.canActivate(
        createContext({
          headers: { cookie: `${AUTH_COOKIE_NAME}=not-a-jwt` },
        }),
      ),
    ).rejects.toMatchObject({ apiErrorCode: 'unauthorized' });
  });

  it('rejects an expired JWT as unauthorized', async () => {
    const token = await jwtService.signAsync({
      sub: 'user-1',
      tokenVersion: 0,
      exp: Math.floor(Date.now() / 1000) - 60,
    });

    await expect(
      guard.canActivate(
        createContext({
          headers: { cookie: `${AUTH_COOKIE_NAME}=${token}` },
        }),
      ),
    ).rejects.toMatchObject({ apiErrorCode: 'unauthorized' });
  });

  it('accepts a valid JWT in the session cookie', async () => {
    const token = await jwtService.signAsync({ sub: 'user-1', tokenVersion: 1 });
    const request: Record<string, unknown> = {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${token}` },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({ sub: 'user-1', tokenVersion: 1 });
  });
});
