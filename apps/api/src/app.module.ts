import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AuthModule } from './auth/auth.module';
import { CleanupModule } from './cleanup/cleanup.module';
import { CommonModule } from './common/common.module';
import { type AppEnv, envFilePaths, validateEnv } from './config/env';
import { resolveTypeOrmDatabaseUrl } from './config/test-database';
import { SnakeNamingStrategy } from './config/snake-naming.strategy';
import { ConversionModule } from './conversion/conversion.module';
import { FilesModule } from './files/files.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { SharesModule } from './shares/shares.module';
import { StorageModule } from './file-store/storage.module';
import { TelegramModule } from './telegram/telegram.module';
import { UsersModule } from './users/users.module';
import { WorkerModule } from './worker/worker.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilePaths(),
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService<AppEnv, true>) => ({
        type: 'postgres' as const,
        url: await resolveTypeOrmDatabaseUrl(
          config.get('DATABASE_URL', { infer: true }),
          config.get('NODE_ENV', { infer: true }),
        ),
        autoLoadEntities: true,
        namingStrategy: new SnakeNamingStrategy(),
        synchronize: config.get('TYPEORM_SYNCHRONIZE', { infer: true }),
        logging: false,
      }),
    }),
    CommonModule,
    CleanupModule,
    ConversionModule,
    HealthModule,
    UsersModule,
    AuthModule,
    ApiKeysModule,
    JobsModule,
    StorageModule,
    FilesModule,
    SharesModule,
    TelegramModule,
    WorkerModule,
  ],
})
export class AppModule {}
