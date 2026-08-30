import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedApiKey } from '@/common/api-key.authenticator';
import { CurrentApiKey } from '@/common/current-api-key.decorator';
import { ApiKeyGuard } from '@/common/guards/api-key.guard';
import { toFileStream, type FileListResponse } from './file-response';
import { FilesService } from './files.service';

@Controller('v1/files')
@UseGuards(ApiKeyGuard)
export class V1FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  async list(@CurrentApiKey() apiKey: AuthenticatedApiKey): Promise<FileListResponse> {
    return this.filesService.listForOwner(apiKey.userId, 'api');
  }

  @Get(':id/download')
  @Header('Cache-Control', 'private, no-store')
  async download(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
  ): Promise<StreamableFile> {
    const file = await this.filesService.downloadForApi(id, apiKey.userId);
    return toFileStream(file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
  ): Promise<void> {
    await this.filesService.deleteForOwner(id, apiKey.userId);
  }
}
