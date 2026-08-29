import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { type AuthenticatedApiKey } from './api-key.authenticator';
import { ApiException } from './errors/api-exception';

type RequestWithApiKey = Request & {
  apiKey?: AuthenticatedApiKey;
};

export const CurrentApiKey = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedApiKey => {
    const request = context.switchToHttp().getRequest<RequestWithApiKey>();
    if (!request.apiKey) {
      throw new ApiException('unauthorized');
    }

    return request.apiKey;
  },
);
