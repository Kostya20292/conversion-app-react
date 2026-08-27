import { describe, expect, it } from 'vitest';
import { ConversionJob } from './conversion-job.entity';

describe('ConversionJob (ТЗ §3.2)', () => {
  it('starts in queued', () => {
    expect(new ConversionJob().status).toBe('queued');
  });
});
