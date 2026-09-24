import { hasPostgresErrorCode } from './postgres-error.js';

const UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(error: unknown): boolean {
  return hasPostgresErrorCode(error, UNIQUE_VIOLATION);
}
