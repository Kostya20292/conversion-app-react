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
import type { AuthenticatedApiKey } from '@/common/api-key.authenticator';
import { CurrentApiKey } from '@/common/current-api-key.decorator';
import { ApiKeyGuard } from '@/common/guards/api-key.guard';
import { CreateShareDto } from './dto/create-share.dto';
import type { ShareCreatedResponse, ShareListResponse } from './share-response';
import { SharesService } from './shares.service';

@Controller('v1/shares')
@UseGuards(ApiKeyGuard)
export class V1SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateShareDto,
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
  ): Promise<ShareCreatedResponse> {
    return this.sharesService.create(dto, apiKey.userId, 'api');
  }

  @Get()
  async list(@CurrentApiKey() apiKey: AuthenticatedApiKey): Promise<ShareListResponse> {
    return this.sharesService.listForOwner(apiKey.userId);
  }

  @Delete(':token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Param('token') token: string,
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
  ): Promise<void> {
    await this.sharesService.revokeForOwner(token, apiKey.userId);
  }
}
