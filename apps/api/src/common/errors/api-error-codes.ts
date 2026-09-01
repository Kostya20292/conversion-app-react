import type { ApiErrorCode } from '@convertly/shared';

export {
  API_ERROR_CODES,
  ERROR_CODE_BY_HTTP_STATUS,
  HTTP_STATUS_BY_ERROR_CODE,
  type ApiErrorCode,
} from '@convertly/shared';

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
