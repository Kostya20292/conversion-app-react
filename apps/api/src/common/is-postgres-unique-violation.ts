import { QueryFailedError } from 'typeorm';

export const isPostgresUniqueViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError: unknown = error.driverError;
  if (typeof driverError !== 'object' || driverError === null || !('code' in driverError)) {
    return false;
  }

  return driverError.code === '23505';
};
