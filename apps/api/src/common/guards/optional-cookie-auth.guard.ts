import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { readAccessToken } from '@/common/auth-cookie';
import type { AuthRequest } from '@/common/auth-request';
import { CookieAuthGuard } from './cookie-auth.guard';

@Injectable()
export class OptionalCookieAuthGuard implements CanActivate {
  constructor(private readonly cookieAuthGuard: CookieAuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!readAccessToken(request)) {
      return true;
    }

    return this.cookieAuthGuard.canActivate(context);
  }
}
