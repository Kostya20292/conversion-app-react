import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '@/common/current-user.decorator';
import { CookieAuthGuard } from '@/common/guards/cookie-auth.guard';
import { OptionalCookieAuthGuard } from '@/common/guards/optional-cookie-auth.guard';
import { OptionalAuthUser } from '@/common/optional-auth-user.decorator';
import type { User } from '@/users/user.entity';
import { toFileStream, type FileListResponse } from './file-response';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  @UseGuards(CookieAuthGuard)
  async list(@CurrentUser() user: User): Promise<FileListResponse> {
    return this.filesService.listForOwner(user.id, 'ui');
  }

  @Get(':id/download')
  @UseGuards(OptionalCookieAuthGuard)
  @Header('Cache-Control', 'private, no-store')
  async download(
    @Param('id') id: string,
    @Query('token') token: string | undefined,
    @OptionalAuthUser() user: User | null,
  ): Promise<StreamableFile> {
    const file = await this.filesService.downloadForUi(id, user?.id ?? null, token);
    return toFileStream(file);
  }

  @Delete(':id')
  @UseGuards(CookieAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: User): Promise<void> {
    await this.filesService.deleteForOwner(id, user.id);
  }
}
