import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { type AppEnv, envFilePaths, validateEnv } from './config/env';
import { HealthModule } from './health/health.module';

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
        synchronize: config.get('NODE_ENV', { infer: true }) !== 'production',
        logging: false,
      }),
    }),
    HealthModule,
  ],
})
export class AppModule {}
