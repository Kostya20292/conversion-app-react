import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { User } from '@/users/user.entity';
import type { AuthRequest } from './auth-request';

export const OptionalAuthUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User | null => {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    return request.authUser ?? null;
  },
);
