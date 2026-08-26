import { Injectable } from '@nestjs/common';

export type AuthenticatedApiKey = {
  id: string;
  userId: string;
};

export const API_KEY_AUTHENTICATOR = Symbol('API_KEY_AUTHENTICATOR');

export type ApiKeyAuthenticator = {
  authenticate: (plaintextKey: string) => Promise<AuthenticatedApiKey | null>;
};

@Injectable()
export class RejectAllApiKeyAuthenticator implements ApiKeyAuthenticator {
  authenticate(): Promise<AuthenticatedApiKey | null> {
    return Promise.resolve(null);
  }
}
