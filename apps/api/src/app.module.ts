import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { type AppEnv, envFilePaths, validateEnv } from './config/env';
import { SnakeNamingStrategy } from './config/snake-naming.strategy';
import { FilesModule } from './files/files.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { SharesModule } from './shares/shares.module';
import { StorageModule } from './file-store/storage.module';
import { TelegramModule } from './telegram/telegram.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilePaths(),
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>) => ({
        type: 'postgres' as const,
        url: config.get('DATABASE_URL', { infer: true }),
        autoLoadEntities: true,
        namingStrategy: new SnakeNamingStrategy(),
        synchronize: config.get('NODE_ENV', { infer: true }) !== 'production',
        logging: false,
      }),
    }),
    CommonModule,
    HealthModule,
    UsersModule,
    AuthModule,
    ApiKeysModule,
    JobsModule,
    StorageModule,
    FilesModule,
    SharesModule,
    TelegramModule,
  ],
})
export class AppModule {}
