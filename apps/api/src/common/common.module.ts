import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from '@/api-keys/api-key.entity';
import { DbApiKeyAuthenticator } from '@/api-keys/db-api-key.authenticator';
import { type AppEnv } from '@/config/env';
import { User } from '@/users/user.entity';
import { API_KEY_AUTHENTICATOR } from './api-key.authenticator';
import { ApiExceptionFilter } from './errors/api-exception.filter';
import { ApiKeyGuard } from './guards/api-key.guard';
import { CookieAuthGuard } from './guards/cookie-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalCookieAuthGuard } from './guards/optional-cookie-auth.guard';
import { createValidationPipe } from './pipes/create-validation-pipe';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, ApiKey]),
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
    CookieAuthGuard,
    OptionalCookieAuthGuard,
    ApiKeyGuard,
    { provide: API_KEY_AUTHENTICATOR, useClass: DbApiKeyAuthenticator },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_PIPE, useFactory: createValidationPipe },
  ],
  exports: [
    JwtModule,
    ThrottlerModule,
    TypeOrmModule,
    JwtAuthGuard,
    CookieAuthGuard,
    OptionalCookieAuthGuard,
    ApiKeyGuard,
    API_KEY_AUTHENTICATOR,
  ],
})
export class CommonModule {}
