import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { User } from '@/users/user.entity';
import type { AuthRequest } from './auth-request';
import { ApiException } from './errors/api-exception';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User => {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!request.authUser) {
      throw new ApiException('unauthorized');
    }

    return request.authUser;
  },
);
