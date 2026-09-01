import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { type AppEnv, parseCorsOrigins, resolveStorageRoot } from './config/env';
import { ensureStorageDirectories } from './config/storage-dirs';
import { TelegramBotService } from './telegram/telegram-bot.service';
import { serveWebSpa } from './web/serve-web-spa';
import { JobWorkerService } from './worker/job-worker.service';

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService<AppEnv, true>);

  if (config.get('NODE_ENV', { infer: true }) === 'production') {
    app.set('trust proxy', 1);
  }

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.enableCors({
    origin: parseCorsOrigins(config.get('CORS_ORIGIN', { infer: true })),
    credentials: true,
  });

  const webDist = config.get('WEB_DIST', { infer: true });
  if (webDist.length > 0) {
    serveWebSpa(app, webDist);
  }

  await ensureStorageDirectories(resolveStorageRoot(config.get('STORAGE_ROOT', { infer: true })));
  app.get(JobWorkerService).start();
  await app.get(TelegramBotService).start();

  await app.listen(
    config.get('PORT', { infer: true }),
    config.get('LISTEN_HOST', { infer: true }),
  );
};

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
