export const JOB_STATUSES = ['queued', 'processing', 'completed', 'failed'] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];
