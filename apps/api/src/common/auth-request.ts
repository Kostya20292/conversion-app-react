import type { Request } from 'express';
import type { AuthenticatedApiKey } from '@/common/api-key.authenticator';
import type { JwtAccessPayload } from '@/common/jwt-access-payload';
import type { User } from '@/users/user.entity';

export type AuthRequest = Request & {
  user?: JwtAccessPayload;
  authUser?: User;
  apiKey?: AuthenticatedApiKey;
};
