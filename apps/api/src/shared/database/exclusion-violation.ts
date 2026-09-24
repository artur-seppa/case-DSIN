import { hasPostgresErrorCode } from './postgres-error.js';

const EXCLUSION_VIOLATION = '23P01';

export function isExclusionViolation(error: unknown): boolean {
  return hasPostgresErrorCode(error, EXCLUSION_VIOLATION);
}
