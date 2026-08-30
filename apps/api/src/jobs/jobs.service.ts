import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MIME_BY_FORMAT } from '@/common/domain/file-mime';
import type { RequestSource } from '@/common/domain/request-source';
import { ApiException } from '@/common/errors/api-exception';
import { resultFileName, sourceFileNameFromUpload } from '@/common/result-file-name';
import { SignedDownloadTokenService } from '@/common/signed-download-token';
import { uploadStorageKey } from '@/file-store/storage-key';
import { StorageService } from '@/file-store/storage.service';
import { type UploadFile, validateUpload } from '@/file-store/validate-upload';
import { FilesService } from '@/files/files.service';
import { ConversionJob } from './conversion-job.entity';
import {
  type JobCreatedResponse,
  type JobDownload,
  type JobStatusResponse,
  toJobCreatedResponse,
  toJobStatusResponse,
} from './job-response';

export const RESULT_TTL_MS = 24 * 60 * 60 * 1000;

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
    private readonly downloadTokens: SignedDownloadTokenService,
    private readonly files: FilesService,
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
      sourceFileName: sourceFileNameFromUpload(file.originalName),
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
    const job = await this.requireUiJob(id, viewerUserId);
    return this.toStatus(job, 'ui');
  }

  async getForApi(id: string, ownerUserId: string): Promise<JobStatusResponse> {
    const job = await this.requireApiJob(id, ownerUserId);
    return this.toStatus(job, 'api');
  }

  async downloadForUi(
    id: string,
    viewerUserId: string | null,
    token: string | undefined,
  ): Promise<JobDownload> {
    const job = await this.requireUiJob(id, viewerUserId);
    if (job.status === 'failed') {
      throw new ApiException('conversion_failed');
    }

    this.assertUiDownloadAccess(job, viewerUserId, token);
    return this.readResult(job);
  }

  async downloadForApi(id: string, ownerUserId: string): Promise<JobDownload> {
    const job = await this.requireApiJob(id, ownerUserId);
    return this.readResult(job);
  }

  private async toStatus(job: ConversionJob, channel: 'ui' | 'api'): Promise<JobStatusResponse> {
    if (job.status !== 'completed') {
      return toJobStatusResponse(job);
    }

    const savedToProfile = await this.files.isSavedForJob(job.id);

    if (channel === 'ui') {
      const issued = this.downloadTokens.issue(job.id);
      return toJobStatusResponse(
        job,
        {
          url: `/api/jobs/${job.id}/download?token=${encodeURIComponent(issued.token)}`,
          expiresAt: issued.expiresAt,
        },
        savedToProfile,
      );
    }

    const finishedAt = job.finishedAt ?? new Date();
    return toJobStatusResponse(
      job,
      {
        url: `/api/v1/jobs/${job.id}/download`,
        expiresAt: new Date(finishedAt.getTime() + RESULT_TTL_MS),
      },
      savedToProfile,
    );
  }

  private assertUiDownloadAccess(
    job: ConversionJob,
    viewerUserId: string | null,
    token: string | undefined,
  ): void {
    if (job.userId !== null && job.userId === viewerUserId) {
      return;
    }

    if (token === undefined || token.length === 0) {
      throw new ApiException('not_found');
    }

    this.downloadTokens.verify(token, job.id);
  }

  private async readResult(job: ConversionJob): Promise<JobDownload> {
    if (job.status === 'failed') {
      throw new ApiException('conversion_failed');
    }

    if (job.status !== 'completed' || job.resultStorageKey === null) {
      throw new ApiException('not_found');
    }

    try {
      const bytes = await this.storage.read(job.resultStorageKey);
      return {
        bytes,
        mimeType: MIME_BY_FORMAT[job.targetFormat],
        filename: resultFileName(job.sourceFileName, job.targetFormat),
      };
    } catch {
      throw new ApiException('gone');
    }
  }

  private async requireUiJob(id: string, viewerUserId: string | null): Promise<ConversionJob> {
    const job = await this.jobs.findOneBy({ id });
    if (!job) {
      throw new ApiException('not_found');
    }

    if (job.userId !== null && job.userId !== viewerUserId) {
      throw new ApiException('not_found');
    }

    return job;
  }

  private async requireApiJob(id: string, ownerUserId: string): Promise<ConversionJob> {
    const job = await this.jobs.findOneBy({ id });
    if (!job || job.userId !== ownerUserId) {
      throw new ApiException('not_found');
    }

    return job;
  }
};
