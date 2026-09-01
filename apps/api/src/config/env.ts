import { existsSync } from 'node:fs';
import path from 'node:path';

const NODE_ENVS = ['development', 'production', 'test'] as const;

export type NodeEnv = (typeof NODE_ENVS)[number];

export type AppEnv = {
  NODE_ENV: NodeEnv;
  PORT: number;
  LISTEN_HOST: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
  STORAGE_ROOT: string;
  WEB_DIST: string;
  TYPEORM_SYNCHRONIZE: boolean;
  TELEGRAM_BOT_TOKEN: string;
};

export const findRepoRoot = (startDir = process.cwd()): string => {
  let dir = startDir;

  while (true) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return startDir;
    }

    dir = parent;
  }
};

export const envFilePaths = (): string[] => {
  const repoRoot = findRepoRoot();
  return [path.join(process.cwd(), '.env'), path.join(repoRoot, '.env')];
};

const isNodeEnv = (value: string): value is NodeEnv => NODE_ENVS.includes(value as NodeEnv);

export const validateEnv = (config: Record<string, unknown>): AppEnv => {
  const nodeEnv = typeof config.NODE_ENV === 'string' ? config.NODE_ENV : 'development';
  if (!isNodeEnv(nodeEnv)) {
    throw new Error('NODE_ENV must be development, production, or test');
  }

  const port = Number(config.PORT ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const databaseUrl = typeof config.DATABASE_URL === 'string' ? config.DATABASE_URL : '';
  if (!databaseUrl.startsWith('postgres')) {
    throw new Error('DATABASE_URL is required and must be a PostgreSQL connection URL');
  }

  const jwtSecret = typeof config.JWT_SECRET === 'string' ? config.JWT_SECRET.trim() : '';
  if (jwtSecret.length === 0) {
    throw new Error('JWT_SECRET is required');
  }

  const corsOrigin = typeof config.CORS_ORIGIN === 'string' ? config.CORS_ORIGIN.trim() : '';
  if (corsOrigin.length === 0) {
    throw new Error('CORS_ORIGIN is required');
  }

  const storageRoot =
    typeof config.STORAGE_ROOT === 'string' && config.STORAGE_ROOT.trim().length > 0
      ? config.STORAGE_ROOT.trim()
      : 'storage';

  const webDist = typeof config.WEB_DIST === 'string' ? config.WEB_DIST.trim() : '';

  const listenHostRaw = typeof config.LISTEN_HOST === 'string' ? config.LISTEN_HOST.trim() : '';
  const listenHost = listenHostRaw.length > 0 ? listenHostRaw : nodeEnv === 'production' ? '0.0.0.0' : '127.0.0.1';

  const typeormSynchronize = nodeEnv !== 'production' || parseEnvFlag(config.TYPEORM_SYNCHRONIZE);

  const telegramBotToken =
    typeof config.TELEGRAM_BOT_TOKEN === 'string' ? config.TELEGRAM_BOT_TOKEN.trim() : '';

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    LISTEN_HOST: listenHost,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    CORS_ORIGIN: corsOrigin,
    STORAGE_ROOT: storageRoot,
    WEB_DIST: webDist,
    TYPEORM_SYNCHRONIZE: typeormSynchronize,
    TELEGRAM_BOT_TOKEN: telegramBotToken,
  };
};

const parseEnvFlag = (value: unknown): boolean => {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

export const parseCorsOrigins = (corsOrigin: string): string[] =>
  corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

export const resolveStorageRoot = (storageRoot: string): string => {
  if (path.isAbsolute(storageRoot)) {
    return storageRoot;
  }

  return path.resolve(findRepoRoot(), storageRoot);
};
