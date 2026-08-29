import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { AuthenticatedApiKey } from '@/common/api-key.authenticator';
import { CurrentApiKey } from '@/common/current-api-key.decorator';
import { ApiKeyGuard } from '@/common/guards/api-key.guard';
import type { JobCreatedResponse, JobStatusResponse } from './job-response';
import { JobFileInterceptor, readTargetFormat, toUploadFiles } from './job-upload';
import { JobsService } from './jobs.service';

@Controller('v1/jobs')
@UseGuards(ApiKeyGuard)
export class V1JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(JobFileInterceptor)
  async create(
    @UploadedFile() file: unknown,
    @Body('target_format') targetFormat: unknown,
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
  ): Promise<JobCreatedResponse> {
    return this.jobsService.create({
      files: toUploadFiles(file),
      targetFormat: readTargetFormat(targetFormat),
      userId: apiKey.userId,
      sourceOfRequest: 'api',
    });
  }

  @Get(':id')
  async get(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
  ): Promise<JobStatusResponse> {
    return this.jobsService.getForApi(id, apiKey.userId);
  }
}
