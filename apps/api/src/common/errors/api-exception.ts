import { HttpException } from '@nestjs/common';
import {
  type ApiErrorCode,
  DEFAULT_MESSAGE_BY_ERROR_CODE,
  HTTP_STATUS_BY_ERROR_CODE,
} from './api-error-codes';

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
};

export class ApiException extends HttpException {
  readonly apiErrorCode: ApiErrorCode;
  readonly clientMessage: string;

  constructor(
    code: ApiErrorCode,
    message: string = DEFAULT_MESSAGE_BY_ERROR_CODE[code],
    cause?: unknown,
  ) {
    const body: ApiErrorBody = { error: { code, message } };
    super(body, HTTP_STATUS_BY_ERROR_CODE[code], cause === undefined ? undefined : { cause });
    this.apiErrorCode = code;
    this.clientMessage = message;
  }
}
