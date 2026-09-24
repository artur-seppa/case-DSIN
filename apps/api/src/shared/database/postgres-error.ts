import { QueryFailedError } from 'typeorm';

export function hasPostgresErrorCode(error: unknown, code: string): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code === code
  );
}
