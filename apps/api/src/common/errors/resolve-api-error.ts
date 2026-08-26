import { HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import {
  type ApiErrorCode,
  DEFAULT_MESSAGE_BY_ERROR_CODE,
  ERROR_CODE_BY_HTTP_STATUS,
} from './api-error-codes';
import { ApiException, type ApiErrorBody } from './api-exception';

export type ResolvedApiError = {
  status: number;
} & ApiErrorBody;

const resolveCodeForStatus = (status: number): ApiErrorCode => {
  const mapped = ERROR_CODE_BY_HTTP_STATUS[status];
  if (mapped) {
    return mapped;
  }

  return status >= HttpStatus.INTERNAL_SERVER_ERROR ? 'internal_error' : 'invalid_request';
};

export const resolveApiError = (exception: unknown): ResolvedApiError => {
  if (exception instanceof ApiException) {
    return {
      status: exception.getStatus(),
      error: {
        code: exception.apiErrorCode,
        message: exception.clientMessage,
      },
    };
  }

  if (exception instanceof ThrottlerException) {
    return {
      status: HttpStatus.TOO_MANY_REQUESTS,
      error: {
        code: 'rate_limited',
        message: DEFAULT_MESSAGE_BY_ERROR_CODE.rate_limited,
      },
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const code = resolveCodeForStatus(status);

    return {
      status,
      error: {
        code,
        message: DEFAULT_MESSAGE_BY_ERROR_CODE[code],
      },
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    error: {
      code: 'internal_error',
      message: DEFAULT_MESSAGE_BY_ERROR_CODE.internal_error,
    },
  };
};
