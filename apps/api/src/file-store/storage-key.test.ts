import { describe, expect, it } from 'vitest';
import { profileStorageKey, resultStorageKey, uploadStorageKey } from './storage-key';

const JOB_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const FILE_ID = '33333333-3333-4333-8333-333333333333';

describe('storage keys (архитектура §3.3 / план §6.2)', () => {
  it('puts an upload under uploads/<job_id>/, not the original filename', () => {
    const key = uploadStorageKey(JOB_ID);

    expect(key.startsWith(`uploads/${JOB_ID}`)).toBe(true);
    expect(key).not.toContain('report.docx');
    expect(key).not.toContain('photo.jpg');
  });

  it('puts a result under results/<job_id>/, not the original filename', () => {
    const key = resultStorageKey(JOB_ID);

    expect(key.startsWith(`results/${JOB_ID}`)).toBe(true);
    expect(key).not.toContain('holiday.png');
  });

  it('puts a profile file under profile/<user_id>/<file_id>/, not the original filename', () => {
    const key = profileStorageKey(USER_ID, FILE_ID);

    expect(key.startsWith(`profile/${USER_ID}/${FILE_ID}`)).toBe(true);
    expect(key).not.toContain('invoice.pdf');
  });
});
