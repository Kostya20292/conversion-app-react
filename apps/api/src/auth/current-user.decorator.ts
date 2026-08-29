import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { ApiException } from '@/common/errors/api-exception';
import type { User } from '@/users/user.entity';
import type { AuthRequest } from './auth-request';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User => {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!request.authUser) {
      throw new ApiException('unauthorized');
    }

    return request.authUser;
  },
);
