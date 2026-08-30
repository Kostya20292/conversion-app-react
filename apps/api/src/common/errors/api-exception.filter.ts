import {
  Catch,
  type ExceptionFilter,
  type ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiException } from './api-exception';
import { resolveApiError } from './resolve-api-error';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, error } = resolveApiError(exception);

    if (!(exception instanceof HttpException) || status >= 500) {
      this.logger.error(exception);
    }

    if (exception instanceof ApiException && exception.retryAfterSeconds !== undefined) {
      response.setHeader('Retry-After', String(exception.retryAfterSeconds));
    }

    response.status(status).json({ error });
  }
}
