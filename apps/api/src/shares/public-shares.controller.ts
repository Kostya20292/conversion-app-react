import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import { toShareFileStream, type SharePublicResponse } from './share-response';
import { SharesService } from './shares.service';

@Controller('v1/public/s')
export class PublicSharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Get(':token/download')
  @Header('Cache-Control', 'private, no-store')
  async download(@Param('token') token: string): Promise<StreamableFile> {
    const file = await this.sharesService.downloadPublic(token);
    return toShareFileStream(file);
  }

  @Get(':token')
  async get(@Param('token') token: string): Promise<SharePublicResponse> {
    return this.sharesService.getPublic(token);
  }
}
