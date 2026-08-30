import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '@/common/current-user.decorator';
import { CookieAuthGuard } from '@/common/guards/cookie-auth.guard';
import { OptionalCookieAuthGuard } from '@/common/guards/optional-cookie-auth.guard';
import { OptionalAuthUser } from '@/common/optional-auth-user.decorator';
import type { User } from '@/users/user.entity';
import { CreateShareDto } from './dto/create-share.dto';
import type { ShareCreatedResponse, ShareListResponse } from './share-response';
import { SharesService } from './shares.service';

@Controller('shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Post()
  @UseGuards(OptionalCookieAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateShareDto,
    @OptionalAuthUser() user: User | null,
  ): Promise<ShareCreatedResponse> {
    return this.sharesService.create(dto, user?.id ?? null, 'ui');
  }

  @Get()
  @UseGuards(CookieAuthGuard)
  async list(@CurrentUser() user: User): Promise<ShareListResponse> {
    return this.sharesService.listForOwner(user.id);
  }

  @Delete(':token')
  @UseGuards(CookieAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@Param('token') token: string, @CurrentUser() user: User): Promise<void> {
    await this.sharesService.revokeForOwner(token, user.id);
  }
}
