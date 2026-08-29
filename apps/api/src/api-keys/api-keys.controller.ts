import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/common/current-user.decorator';
import { CookieAuthGuard } from '@/common/guards/cookie-auth.guard';
import type { User } from '@/users/user.entity';
import {
  ApiKeysService,
  type ApiKeyListResponse,
  type ApiKeyPlaintextResponse,
} from './api-keys.service';

@Controller('api-keys')
@UseGuards(CookieAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  async list(@CurrentUser() user: User): Promise<ApiKeyListResponse> {
    return this.apiKeysService.listActiveForUser(user.id);
  }

  @Post('reissue')
  async reissue(@CurrentUser() user: User): Promise<ApiKeyPlaintextResponse> {
    return this.apiKeysService.reissueForUser(user.id);
  }
}
