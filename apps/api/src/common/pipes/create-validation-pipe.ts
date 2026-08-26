import { ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { DEFAULT_MESSAGE_BY_ERROR_CODE } from '@/common/errors/api-error-codes';
import { ApiException } from '@/common/errors/api-exception';

const collectValidationMessages = (errors: ValidationError[]): string[] => {
  const messages: string[] = [];

  for (const error of errors) {
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }

    if (error.children && error.children.length > 0) {
      messages.push(...collectValidationMessages(error.children));
    }
  }

  return messages;
};

export const createValidationPipe = (): ValidationPipe =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]): ApiException => {
      const messages = collectValidationMessages(errors);
      const message =
        messages.length > 0 ? messages.join('; ') : DEFAULT_MESSAGE_BY_ERROR_CODE.invalid_request;

      return new ApiException('invalid_request', message);
    },
  });
