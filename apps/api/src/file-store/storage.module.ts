import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type AppEnv, resolveStorageRoot } from '@/config/env';
import { StorageService } from './storage.service';

@Module({
  providers: [
    {
      provide: StorageService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>): StorageService =>
        new StorageService(resolveStorageRoot(config.get('STORAGE_ROOT', { infer: true }))),
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
