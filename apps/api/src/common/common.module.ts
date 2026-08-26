import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { type AppEnv } from '@/config/env';
import { API_KEY_AUTHENTICATOR, RejectAllApiKeyAuthenticator } from './api-key.authenticator';
import { ApiExceptionFilter } from './errors/api-exception.filter';
import { ApiKeyGuard } from './guards/api-key.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { createValidationPipe } from './pipes/create-validation-pipe';

@Global()
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 10_000,
      },
    ]),
  ],
  providers: [
    JwtAuthGuard,
    ApiKeyGuard,
    { provide: API_KEY_AUTHENTICATOR, useClass: RejectAllApiKeyAuthenticator },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_PIPE, useFactory: createValidationPipe },
  ],
  exports: [JwtModule, ThrottlerModule, JwtAuthGuard, ApiKeyGuard, API_KEY_AUTHENTICATOR],
})
export class CommonModule {}
