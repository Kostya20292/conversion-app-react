import type { Request } from 'express';
import type { JwtAccessPayload } from '@/common/jwt-access-payload';
import type { User } from '@/users/user.entity';

export type AuthRequest = Request & {
  user?: JwtAccessPayload;
  authUser?: User;
};
