import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import {
  type ApiKeyAuthenticator,
  API_KEY_AUTHENTICATOR,
  type AuthenticatedApiKey,
} from '@/common/api-key.authenticator';
import { ApiException } from '@/common/errors/api-exception';

type RequestWithApiKey = Request & {
  apiKey?: AuthenticatedApiKey;
};

const readApiKeyHeader = (request: Request): string | undefined => {
  const headerValue = request.headers['x-api-key'];
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const trimmed = raw?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : undefined;
};

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Inject(API_KEY_AUTHENTICATOR)
    private readonly apiKeyAuthenticator: ApiKeyAuthenticator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithApiKey>();
    const plaintextKey = readApiKeyHeader(request);
    if (!plaintextKey) {
      throw new ApiException('unauthorized');
    }

    const apiKey = await this.apiKeyAuthenticator.authenticate(plaintextKey);
    if (!apiKey) {
      throw new ApiException('unauthorized');
    }

    request.apiKey = apiKey;
    return true;
  }
}
