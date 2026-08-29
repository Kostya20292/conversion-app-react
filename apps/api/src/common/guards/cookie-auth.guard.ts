import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthRequest } from '@/common/auth-request';
import { ApiException } from '@/common/errors/api-exception';
import { User } from '@/users/user.entity';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class CookieAuthGuard implements CanActivate {
  constructor(
    private readonly jwtAuthGuard: JwtAuthGuard,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.jwtAuthGuard.canActivate(context);

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const payload = request.user;
    if (!payload) {
      throw new ApiException('unauthorized');
    }

    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new ApiException('unauthorized');
    }

    request.authUser = user;
    return true;
  }
}
