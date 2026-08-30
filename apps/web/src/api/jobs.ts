import { apiFetch, type ApiFetchOptions } from './http';
import type { ConversionJob, JobFileFormat } from '@/types/api';

export type CreateJobRequest = {
  file: File;
  targetFormat: JobFileFormat;
};

export const createJobRequest = async (
  input: CreateJobRequest,
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<ConversionJob> => {
  const body = new FormData();
  body.append('file', input.file);
  body.append('target_format', input.targetFormat);

  return apiFetch<ConversionJob>('/api/jobs', {
    method: 'POST',
    body,
    signal: options?.signal,
  });
};

export const getJobRequest = async (
  jobId: string,
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<ConversionJob> =>
  apiFetch<ConversionJob>(`/api/jobs/${jobId}`, {
    signal: options?.signal,
  });
