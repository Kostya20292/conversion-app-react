import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { RequestSource } from '@/common/domain/request-source';
import { ApiException } from '@/common/errors/api-exception';
import { uploadStorageKey } from '@/file-store/storage-key';
import { StorageService } from '@/file-store/storage.service';
import { type UploadFile, validateUpload } from '@/file-store/validate-upload';
import { ConversionJob } from './conversion-job.entity';
import {
  type JobCreatedResponse,
  type JobStatusResponse,
  toJobCreatedResponse,
  toJobStatusResponse,
} from './job-response';

export type CreateJobInput = {
  files: readonly UploadFile[];
  targetFormat: string | undefined;
  userId: string | null;
  sourceOfRequest: RequestSource;
};

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(ConversionJob) private readonly jobs: Repository<ConversionJob>,
    private readonly storage: StorageService,
  ) {}

  async create(input: CreateJobInput): Promise<JobCreatedResponse> {
    const validated = await validateUpload({
      files: input.files,
      targetFormat: input.targetFormat,
    });
    const file = input.files[0];
    if (!file) {
      throw new ApiException('invalid_request');
    }

    const id = randomUUID();
    const sourceStorageKey = uploadStorageKey(id);
    await this.storage.write(sourceStorageKey, file.bytes);

    const job = this.jobs.create({
      id,
      userId: input.userId,
      sourceFormat: validated.sourceFormat,
      targetFormat: validated.targetFormat,
      status: 'queued',
      sourceOfRequest: input.sourceOfRequest,
      errorCode: null,
      sourceSize: file.bytes.byteLength,
      resultSize: null,
      sourceStorageKey,
      resultStorageKey: null,
      finishedAt: null,
    });

    try {
      await this.jobs.save(job);
    } catch (error: unknown) {
      await this.storage.delete(sourceStorageKey).catch(() => undefined);
      throw error;
    }

    return toJobCreatedResponse(job);
  }

  async getForUi(id: string, viewerUserId: string | null): Promise<JobStatusResponse> {
    const job = await this.jobs.findOneBy({ id });
    if (!job) {
      throw new ApiException('not_found');
    }

    if (job.userId !== null && job.userId !== viewerUserId) {
      throw new ApiException('not_found');
    }

    return toJobStatusResponse(job);
  }

  async getForApi(id: string, ownerUserId: string): Promise<JobStatusResponse> {
    const job = await this.jobs.findOneBy({ id });
    if (!job || job.userId !== ownerUserId) {
      throw new ApiException('not_found');
    }

    return toJobStatusResponse(job);
  }
}
