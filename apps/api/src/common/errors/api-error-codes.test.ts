import { describe, expect, it } from 'vitest';
import {
  API_ERROR_CODES,
  DEFAULT_MESSAGE_BY_ERROR_CODE,
  HTTP_STATUS_BY_ERROR_CODE,
} from './api-error-codes';

describe('API error codes (ТЗ §7.5)', () => {
  it.each([
    ['invalid_request', 400],
    ['unsupported_conversion', 400],
    ['invalid_file_type', 400],
    ['file_too_large', 413],
    ['unauthorized', 401],
    ['not_found', 404],
    ['gone', 410],
    ['conversion_failed', 422],
    ['rate_limited', 429],
    ['internal_error', 500],
    ['conversion_timeout', 504],
  ] as const)('%s → HTTP %i', (code, status) => {
    expect(HTTP_STATUS_BY_ERROR_CODE[code]).toBe(status);
  });

  it('covers every code from the TZ table', () => {
    expect([...API_ERROR_CODES]).toEqual([
      'invalid_request',
      'unsupported_conversion',
      'invalid_file_type',
      'file_too_large',
      'unauthorized',
      'not_found',
      'gone',
      'conversion_failed',
      'rate_limited',
      'internal_error',
      'conversion_timeout',
    ]);
  });

  it('file_too_large uses the TZ example message', () => {
    expect(DEFAULT_MESSAGE_BY_ERROR_CODE.file_too_large).toBe('File exceeds the 10 MB limit');
  });
});
