export const API_ERROR_CODES = [
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
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const HTTP_STATUS_BY_ERROR_CODE: Record<ApiErrorCode, number> = {
  invalid_request: 400,
  unsupported_conversion: 400,
  invalid_file_type: 400,
  file_too_large: 413,
  unauthorized: 401,
  not_found: 404,
  gone: 410,
  conversion_failed: 422,
  rate_limited: 429,
  internal_error: 500,
  conversion_timeout: 504,
};

export const DEFAULT_MESSAGE_BY_ERROR_CODE: Record<ApiErrorCode, string> = {
  invalid_request: 'The request is invalid',
  unsupported_conversion: 'This conversion pair is not supported',
  invalid_file_type: 'The file type is invalid',
  file_too_large: 'File exceeds the 10 MB limit',
  unauthorized: 'Unauthorized',
  not_found: 'Resource not found',
  gone: 'The resource is no longer available',
  conversion_failed: 'Conversion failed',
  rate_limited: 'Too many requests',
  internal_error: 'Internal server error',
  conversion_timeout: 'Conversion timed out',
};

export const ERROR_CODE_BY_HTTP_STATUS: Record<number, ApiErrorCode> = {
  400: 'invalid_request',
  401: 'unauthorized',
  403: 'unauthorized',
  404: 'not_found',
  410: 'gone',
  413: 'file_too_large',
  422: 'conversion_failed',
  429: 'rate_limited',
  500: 'internal_error',
  504: 'conversion_timeout',
};
