import { describe, expect, it } from 'vitest';
import { JOB_STATUSES } from './job-status';

describe('JOB_STATUSES (ТЗ §3.2)', () => {
  it('allows only queued → processing → completed | failed', () => {
    expect([...JOB_STATUSES]).toEqual(['queued', 'processing', 'completed', 'failed']);
  });
});
