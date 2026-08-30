import { type ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';
import { ApiException } from '@/common/errors/api-exception';

@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    _context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new ApiException(
      'rate_limited',
      undefined,
      undefined,
      Math.max(1, throttlerLimitDetail.timeToBlockExpire),
    );
  }
}
