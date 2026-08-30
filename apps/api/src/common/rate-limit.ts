import type { ExecutionContext } from '@nestjs/common';
import type { ThrottlerOptions } from '@nestjs/throttler';
import type { AuthRequest } from './auth-request';

export const LOGIN_RATE_LIMIT = 10;
export const LOGIN_RATE_TTL_MS = 15 * 60 * 1000;
export const GUEST_CONVERT_LIMIT = 10;
export const USER_CONVERT_LIMIT = 60;
export const API_CONVERT_LIMIT = 30;
export const CONVERT_RATE_TTL_MS = 60 * 60 * 1000;

const LOGIN_PATH = '/api/auth/login';
const UI_JOBS_PATH = '/api/jobs';
const V1_JOBS_PATH = '/api/v1/jobs';

const requestPathname = (request: AuthRequest): string => {
  const raw = request.originalUrl ?? request.url ?? '';
  return raw.split('?')[0] ?? '';
};

const pathMatches = (pathname: string, expected: string): boolean => {
  if (pathname === expected) {
    return true;
  }

  const withoutApiPrefix = expected.replace(/^\/api/, '');
  return withoutApiPrefix.length > 0 && pathname === withoutApiPrefix;
};

const isPostTo = (request: AuthRequest, pathname: string): boolean =>
  request.method === 'POST' && pathMatches(requestPathname(request), pathname);

const requestIp = (request: AuthRequest): string => request.ip ?? 'unknown';

export const throttlerOptions: ThrottlerOptions[] = [
  {
    name: 'login',
    ttl: LOGIN_RATE_TTL_MS,
    limit: LOGIN_RATE_LIMIT,
    skipIf: (context: ExecutionContext) =>
      !isPostTo(context.switchToHttp().getRequest<AuthRequest>(), LOGIN_PATH),
    getTracker: (req) => requestIp(req as AuthRequest),
  },
  {
    name: 'ui-guest-convert',
    ttl: CONVERT_RATE_TTL_MS,
    limit: GUEST_CONVERT_LIMIT,
    skipIf: (context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest<AuthRequest>();
      return !isPostTo(request, UI_JOBS_PATH) || request.authUser !== undefined;
    },
    getTracker: (req) => requestIp(req as AuthRequest),
  },
  {
    name: 'ui-user-convert',
    ttl: CONVERT_RATE_TTL_MS,
    limit: USER_CONVERT_LIMIT,
    skipIf: (context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest<AuthRequest>();
      return !isPostTo(request, UI_JOBS_PATH) || request.authUser === undefined;
    },
    getTracker: (_req, context) => {
      const request = context.switchToHttp().getRequest<AuthRequest>();
      return request.authUser?.id ?? requestIp(request);
    },
  },
  {
    name: 'api-convert',
    ttl: CONVERT_RATE_TTL_MS,
    limit: API_CONVERT_LIMIT,
    skipIf: (context: ExecutionContext) =>
      !isPostTo(context.switchToHttp().getRequest<AuthRequest>(), V1_JOBS_PATH),
    getTracker: (_req, context) => {
      const request = context.switchToHttp().getRequest<AuthRequest>();
      return request.apiKey?.id ?? requestIp(request);
    },
  },
];
