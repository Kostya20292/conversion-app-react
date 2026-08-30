import { apiFetch, type ApiFetchOptions } from './http';
import type { ConversionJob, JobFileFormat } from '@/types/api';

const CREATE_JOB_NOTIFY = { network: false, sessionExpired: true } as const;
const POLL_JOB_NOTIFY = {
  network: false,
  serverError: false,
  rateLimited: false,
  sessionExpired: true,
} as const;

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
    notify: CREATE_JOB_NOTIFY,
    signal: options?.signal,
  });
};

export const getJobRequest = async (
  jobId: string,
  options?: Pick<ApiFetchOptions, 'signal'>,
): Promise<ConversionJob> =>
  apiFetch<ConversionJob>(`/api/jobs/${jobId}`, {
    notify: POLL_JOB_NOTIFY,
    signal: options?.signal,
  });
