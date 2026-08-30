import { StreamableFile } from '@nestjs/common';
import type { FileFormat } from '@/common/domain/file-format';
import type { JobStatus } from '@/common/domain/job-status';
import type { ApiErrorCode } from '@/common/errors/api-error-codes';
import { contentDispositionAttachment } from '@/common/result-file-name';
import type { ConversionJob } from './conversion-job.entity';

export type JobCreatedResponse = {
  id: string;
  status: 'queued';
};

export type JobStatusResponse = {
  id: string;
  status: JobStatus;
  source_format: FileFormat;
  target_format: FileFormat;
  download_url?: string;
  expires_at?: string;
  saved_to_profile?: boolean;
  error?: { code: ApiErrorCode };
};

export type JobDownload = {
  bytes: Buffer;
  mimeType: string;
  filename: string;
};

export const toJobCreatedResponse = (job: ConversionJob): JobCreatedResponse => ({
  id: job.id,
  status: 'queued',
});

export const toJobStatusResponse = (
  job: ConversionJob,
  download?: { url: string; expiresAt: Date },
  savedToProfile = false,
): JobStatusResponse => {
  const body: JobStatusResponse = {
    id: job.id,
    status: job.status,
    source_format: job.sourceFormat,
    target_format: job.targetFormat,
  };

  if (job.status === 'completed' && download) {
    body.download_url = download.url;
    body.expires_at = download.expiresAt.toISOString();
    body.saved_to_profile = savedToProfile;
  }

  if (job.status === 'failed' && job.errorCode) {
    body.error = { code: job.errorCode };
  }

  return body;
};

export const toStreamableFile = (file: JobDownload): StreamableFile =>
  new StreamableFile(file.bytes, {
    type: file.mimeType,
    disposition: contentDispositionAttachment(file.filename),
  });
