import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiException } from './errors/api-exception';

export const DOWNLOAD_TOKEN_TTL_SECONDS = 15 * 60;
export const DOWNLOAD_TOKEN_PURPOSE = 'download';

export type IssuedDownloadToken = {
  token: string;
  expiresAt: Date;
};

type JobDownloadTokenPayload = {
  purpose: typeof DOWNLOAD_TOKEN_PURPOSE;
  jobId: string;
};

type FileDownloadTokenPayload = {
  purpose: typeof DOWNLOAD_TOKEN_PURPOSE;
  fileId: string;
};

const isJobDownloadTokenPayload = (value: unknown): value is JobDownloadTokenPayload => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('purpose' in value) || !('jobId' in value)) {
    return false;
  }

  return value.purpose === DOWNLOAD_TOKEN_PURPOSE && typeof value.jobId === 'string';
};

const isFileDownloadTokenPayload = (value: unknown): value is FileDownloadTokenPayload => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('purpose' in value) || !('fileId' in value)) {
    return false;
  }

  return value.purpose === DOWNLOAD_TOKEN_PURPOSE && typeof value.fileId === 'string';
};

@Injectable()
export class SignedDownloadTokenService {
  constructor(private readonly jwtService: JwtService) {}

  issue(jobId: string, now: Date = new Date()): IssuedDownloadToken {
    const expiresAt = new Date(now.getTime() + DOWNLOAD_TOKEN_TTL_SECONDS * 1000);
    const token = this.jwtService.sign(
      { purpose: DOWNLOAD_TOKEN_PURPOSE, jobId } satisfies JobDownloadTokenPayload,
      { expiresIn: DOWNLOAD_TOKEN_TTL_SECONDS },
    );

    return { token, expiresAt };
  }

  issueForFile(fileId: string, now: Date = new Date()): IssuedDownloadToken {
    const expiresAt = new Date(now.getTime() + DOWNLOAD_TOKEN_TTL_SECONDS * 1000);
    const token = this.jwtService.sign(
      { purpose: DOWNLOAD_TOKEN_PURPOSE, fileId } satisfies FileDownloadTokenPayload,
      { expiresIn: DOWNLOAD_TOKEN_TTL_SECONDS },
    );

    return { token, expiresAt };
  }

  verify(token: string, jobId: string): void {
    this.verifyPayload(
      token,
      (payload) => isJobDownloadTokenPayload(payload) && payload.jobId === jobId,
    );
  }

  verifyFile(token: string, fileId: string): void {
    this.verifyPayload(
      token,
      (payload) => isFileDownloadTokenPayload(payload) && payload.fileId === fileId,
    );
  }

  private verifyPayload(token: string, matches: (payload: unknown) => boolean): void {
    try {
      const payload: unknown = this.jwtService.verify(token);
      if (!matches(payload)) {
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
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  error.name === 'TokenExpiredError';
