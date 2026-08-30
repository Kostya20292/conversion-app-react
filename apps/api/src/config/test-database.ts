import { Client } from 'pg';

export const TEST_DATABASE_NAME = 'convertly_test';

export const toTestDatabaseUrl = (databaseUrl: string): string => {
  if (databaseNameFromUrl(databaseUrl) === TEST_DATABASE_NAME) {
    return databaseUrl;
  }

  const parsed = new URL(databaseUrl);
  parsed.pathname = `/${TEST_DATABASE_NAME}`;
  return parsed.href;
};

export const ensureTestDatabase = async (databaseUrl: string): Promise<string> => {
  const testUrl = toTestDatabaseUrl(databaseUrl);
  if (databaseNameFromUrl(databaseUrl) === TEST_DATABASE_NAME) {
    return testUrl;
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      TEST_DATABASE_NAME,
    ]);
    if ((existing.rowCount ?? 0) === 0) {
      await client.query(`CREATE DATABASE ${TEST_DATABASE_NAME}`);
    }
  } catch (error: unknown) {
    if (!isDuplicateDatabase(error)) {
      throw error;
    }
  } finally {
    await client.end();
  }

  return testUrl;
};

export const resolveTypeOrmDatabaseUrl = async (
  databaseUrl: string,
  nodeEnv: string,
): Promise<string> => {
  if (nodeEnv !== 'test') {
    return databaseUrl;
  }

  return ensureTestDatabase(databaseUrl);
};

const databaseNameFromUrl = (databaseUrl: string): string => {
  const pathname = new URL(databaseUrl).pathname;
  return decodeURIComponent(pathname.replace(/^\//, '').replace(/\/$/, ''));
};

const isDuplicateDatabase = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return error.code === '42P04';
};
