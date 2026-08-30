import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from 'vitest';
import {
  DOWNLOAD_TOKEN_PURPOSE,
  DOWNLOAD_TOKEN_TTL_SECONDS,
  SignedDownloadTokenService,
} from './signed-download-token';

const JOB_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_JOB_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SECRET = 'signed-download-unit-secret';

describe('SignedDownloadTokenService (ТЗ §2.2 / §7.7 / план §8.7)', () => {
  const tokens = new SignedDownloadTokenService(new JwtService({ secret: SECRET }));

  it('issues a token that verifies within the 15 minute TTL', () => {
    const issued = tokens.issue(JOB_ID, new Date('2026-08-30T00:00:00.000Z'));

    expect(DOWNLOAD_TOKEN_TTL_SECONDS).toBe(15 * 60);
    expect(issued.expiresAt.toISOString()).toBe('2026-08-30T00:15:00.000Z');
    expect(() => tokens.verify(issued.token, JOB_ID)).not.toThrow();
  });

  it('rejects an expired token as gone', async () => {
    const jwt = new JwtService({ secret: SECRET });
    const token = jwt.sign({
      purpose: DOWNLOAD_TOKEN_PURPOSE,
      jobId: JOB_ID,
      exp: Math.floor(Date.now() / 1000) - 60,
    });

    await expect(Promise.resolve().then(() => tokens.verify(token, JOB_ID))).rejects.toMatchObject({
      apiErrorCode: 'gone',
    });
  });

  it('rejects a token issued for another job as not_found', async () => {
    const { token } = tokens.issue(JOB_ID);

    await expect(
      Promise.resolve().then(() => tokens.verify(token, OTHER_JOB_ID)),
    ).rejects.toMatchObject({
      apiErrorCode: 'not_found',
    });
  });
});
