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
import { OptionalCookieAuthGuard } from '@/common/guards/optional-cookie-auth.guard';
import { OptionalAuthUser } from '@/common/optional-auth-user.decorator';
import type { User } from '@/users/user.entity';
import type { JobCreatedResponse, JobStatusResponse } from './job-response';
import { JobFileInterceptor, readTargetFormat, toUploadFiles } from './job-upload';
import { JobsService } from './jobs.service';

@Controller('jobs')
@UseGuards(OptionalCookieAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
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

  @Get(':id')
  async get(
    @Param('id') id: string,
    @OptionalAuthUser() user: User | null,
  ): Promise<JobStatusResponse> {
    return this.jobsService.getForUi(id, user?.id ?? null);
  }
}
