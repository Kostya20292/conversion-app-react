import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiException } from './errors/api-exception';

export const DOWNLOAD_TOKEN_TTL_SECONDS = 15 * 60;
export const DOWNLOAD_TOKEN_PURPOSE = 'download';

export type IssuedDownloadToken = {
  token: string;
  expiresAt: Date;
};

type DownloadTokenPayload = {
  purpose: typeof DOWNLOAD_TOKEN_PURPOSE;
  jobId: string;
};

const isDownloadTokenPayload = (value: unknown): value is DownloadTokenPayload => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('purpose' in value) || !('jobId' in value)) {
    return false;
  }

  return value.purpose === DOWNLOAD_TOKEN_PURPOSE && typeof value.jobId === 'string';
};

@Injectable()
export class SignedDownloadTokenService {
  constructor(private readonly jwtService: JwtService) {}

  issue(jobId: string, now: Date = new Date()): IssuedDownloadToken {
    const expiresAt = new Date(now.getTime() + DOWNLOAD_TOKEN_TTL_SECONDS * 1000);
    const token = this.jwtService.sign(
      { purpose: DOWNLOAD_TOKEN_PURPOSE, jobId } satisfies DownloadTokenPayload,
      { expiresIn: DOWNLOAD_TOKEN_TTL_SECONDS },
    );

    return { token, expiresAt };
  }

  verify(token: string, jobId: string): void {
    try {
      const payload: unknown = this.jwtService.verify(token);
      if (!isDownloadTokenPayload(payload) || payload.jobId !== jobId) {
        throw new ApiException('not_found');
      }
    } catch (error: unknown) {
      if (error instanceof ApiException) {
        throw error;
      }

      if (isExpiredJwt(error)) {
        throw new ApiException('gone');
      }

      throw new ApiException('not_found');
    }
  }
}

const isExpiredJwt = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'name' in error && error.name === 'TokenExpiredError';
