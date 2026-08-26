import 'reflect-metadata';
import { IsString } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ApiException } from '@/common/errors/api-exception';
import { createValidationPipe } from './create-validation-pipe';

class SampleDto {
  @IsString()
  name!: string;
}

describe('ValidationPipe', () => {
  const pipe = createValidationPipe();
  const metadata = { type: 'body' as const, metatype: SampleDto, data: '' };

  it('rejects non-whitelisted fields as invalid_request', async () => {
    let thrown: unknown;

    try {
      await pipe.transform({ name: 'ok', extra: true }, metadata);
    } catch (error: unknown) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ApiException);
    const exception = thrown as ApiException;
    expect(exception.apiErrorCode).toBe('invalid_request');
    expect(exception.getStatus()).toBe(400);
  });

  it('accepts a whitelisted DTO', async () => {
    const result = await pipe.transform({ name: 'ok' }, metadata);

    expect(result).toEqual({ name: 'ok' });
  });
});
