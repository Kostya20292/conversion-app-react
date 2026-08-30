import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { type AppEnv, parseCorsOrigins, resolveStorageRoot } from './config/env';
import { ensureStorageDirectories } from './config/storage-dirs';
import { JobWorkerService } from './worker/job-worker.service';

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<AppEnv, true>);

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.enableCors({
    origin: parseCorsOrigins(config.get('CORS_ORIGIN', { infer: true })),
    credentials: true,
  });

  await ensureStorageDirectories(resolveStorageRoot(config.get('STORAGE_ROOT', { infer: true })));
  app.get(JobWorkerService).start();

  await app.listen(config.get('PORT', { infer: true }), '127.0.0.1');
};

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
