import { existsSync } from 'node:fs';
import path from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

export const serveWebSpa = (app: NestExpressApplication, webDist: string): void => {
  if (!existsSync(path.join(webDist, 'index.html'))) {
    throw new Error(`WEB_DIST has no index.html: ${webDist}`);
  }

  app.useStaticAssets(webDist, { index: false });
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      next();
      return;
    }

    if (request.path.startsWith('/api')) {
      next();
      return;
    }

    response.sendFile(path.join(webDist, 'index.html'));
  });
};
