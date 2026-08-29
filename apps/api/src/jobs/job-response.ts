import type { FileFormat } from '@/common/domain/file-format';
import type { JobStatus } from '@/common/domain/job-status';
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
};

export const toJobCreatedResponse = (job: ConversionJob): JobCreatedResponse => ({
  id: job.id,
  status: 'queued',
});

export const toJobStatusResponse = (job: ConversionJob): JobStatusResponse => ({
  id: job.id,
  status: job.status,
  source_format: job.sourceFormat,
  target_format: job.targetFormat,
});
