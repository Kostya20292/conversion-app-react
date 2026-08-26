import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { describe, expect, it } from 'vitest';
import { DEFAULT_MESSAGE_BY_ERROR_CODE } from './api-error-codes';
import { ApiException } from './api-exception';
import { resolveApiError } from './resolve-api-error';

describe('resolveApiError', () => {
  it('keeps the TZ envelope for ApiException', () => {
    const exception = new ApiException('file_too_large');

    expect(resolveApiError(exception)).toEqual({
      status: 413,
      error: {
        code: 'file_too_large',
        message: 'File exceeds the 10 MB limit',
      },
    });
  });

  it('does not put a stack trace into the client body', () => {
    const exception = new Error('secret internals\n    at /app/src/jobs/worker.ts:12:3');
    const resolved = resolveApiError(exception);
    const body = JSON.stringify(resolved);

    expect(resolved).toEqual({
      status: 500,
      error: {
        code: 'internal_error',
        message: DEFAULT_MESSAGE_BY_ERROR_CODE.internal_error,
      },
    });
    expect(body).not.toContain('secret internals');
    expect(body).not.toContain('worker.ts');
    expect(body).not.toContain('stack');
  });

  it('maps Nest NotFoundException to not_found without Nest payload fields', () => {
    const resolved = resolveApiError(new NotFoundException());
    const body = JSON.stringify(resolved);

    expect(resolved).toEqual({
      status: 404,
      error: {
        code: 'not_found',
        message: DEFAULT_MESSAGE_BY_ERROR_CODE.not_found,
      },
    });
    expect(body).not.toContain('statusCode');
    expect(body).not.toContain('Not Found');
  });

  it('maps UnauthorizedException to unauthorized', () => {
    expect(resolveApiError(new UnauthorizedException()).error.code).toBe('unauthorized');
    expect(resolveApiError(new UnauthorizedException()).status).toBe(401);
  });

  it('maps BadRequestException to invalid_request', () => {
    expect(resolveApiError(new BadRequestException()).error.code).toBe('invalid_request');
    expect(resolveApiError(new BadRequestException()).status).toBe(400);
  });

  it('maps PayloadTooLargeException to file_too_large', () => {
    expect(resolveApiError(new PayloadTooLargeException())).toEqual({
      status: 413,
      error: {
        code: 'file_too_large',
        message: DEFAULT_MESSAGE_BY_ERROR_CODE.file_too_large,
      },
    });
  });

  it('maps ThrottlerException to rate_limited', () => {
    expect(resolveApiError(new ThrottlerException())).toEqual({
      status: 429,
      error: {
        code: 'rate_limited',
        message: DEFAULT_MESSAGE_BY_ERROR_CODE.rate_limited,
      },
    });
  });
});
