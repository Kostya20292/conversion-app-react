import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AUTH_COOKIE_NAME, readCookie } from '@/common/auth-cookie';
import { ApiException } from '@/common/errors/api-exception';
import type { JwtAccessPayload } from '@/common/jwt-access-payload';

type RequestWithCookies = Request & {
  cookies?: Record<string, string | undefined>;
  user?: JwtAccessPayload;
};

const readAccessToken = (request: RequestWithCookies): string | undefined => {
  const fromCookies = request.cookies?.[AUTH_COOKIE_NAME];
  if (typeof fromCookies === 'string' && fromCookies.length > 0) {
    return fromCookies;
  }

  return readCookie(request.headers.cookie, AUTH_COOKIE_NAME);
};

const isJwtAccessPayload = (value: unknown): value is JwtAccessPayload => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('sub' in value) || !('tokenVersion' in value)) {
    return false;
  }

  return (
    typeof value.sub === 'string' && value.sub.length > 0 && typeof value.tokenVersion === 'number'
  );
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithCookies>();
    const token = readAccessToken(request);
    if (!token) {
      throw new ApiException('unauthorized');
    }

    try {
      const payload: unknown = await this.jwtService.verifyAsync(token);
      if (!isJwtAccessPayload(payload)) {
        throw new ApiException('unauthorized');
      }

      request.user = { sub: payload.sub, tokenVersion: payload.tokenVersion };
      return true;
    } catch (error: unknown) {
      if (error instanceof ApiException) {
        throw error;
      }

      throw new ApiException('unauthorized');
    }
  }
}
