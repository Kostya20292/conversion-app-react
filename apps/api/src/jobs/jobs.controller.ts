import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiThrottlerGuard } from '@/common/guards/api-throttler.guard';
import { OptionalCookieAuthGuard } from '@/common/guards/optional-cookie-auth.guard';
import { OptionalAuthUser } from '@/common/optional-auth-user.decorator';
import type { User } from '@/users/user.entity';
import { toStreamableFile, type JobCreatedResponse, type JobStatusResponse } from './job-response';
import { JobFileInterceptor, readTargetFormat, toUploadFiles } from './job-upload';
import { JobsService } from './jobs.service';

@Controller('jobs')
@UseGuards(OptionalCookieAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(ApiThrottlerGuard)
  @UseInterceptors(JobFileInterceptor)
  async create(
    @UploadedFile() file: unknown,
    @Body('target_format') targetFormat: unknown,
    @OptionalAuthUser() user: User | null,
  ): Promise<JobCreatedResponse> {
    return this.jobsService.create({
      files: toUploadFiles(file),
      targetFormat: readTargetFormat(targetFormat),
      userId: user?.id ?? null,
      sourceOfRequest: 'ui',
    });
  }

  @Get(':id/download')
  @Header('Cache-Control', 'private, no-store')
  async download(
    @Param('id') id: string,
    @Query('token') token: string | undefined,
    @OptionalAuthUser() user: User | null,
  ): Promise<StreamableFile> {
    const file = await this.jobsService.downloadForUi(id, user?.id ?? null, token);
    return toStreamableFile(file);
  }

  @Get(':id')
  async get(
    @Param('id') id: string,
    @OptionalAuthUser() user: User | null,
  ): Promise<JobStatusResponse> {
    return this.jobsService.getForUi(id, user?.id ?? null);
  }
}
