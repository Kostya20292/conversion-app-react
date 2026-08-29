import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AuthUserResponse } from '@/auth/auth-user.response';
import type { AuthenticatedApiKey } from '@/common/api-key.authenticator';
import { CurrentApiKey } from '@/common/current-api-key.decorator';
import { ApiKeyGuard } from '@/common/guards/api-key.guard';
import { UsersService } from './users.service';

@Controller('v1')
export class V1MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(ApiKeyGuard)
  async me(@CurrentApiKey() apiKey: AuthenticatedApiKey): Promise<AuthUserResponse> {
    return this.usersService.getById(apiKey.userId);
  }
}
