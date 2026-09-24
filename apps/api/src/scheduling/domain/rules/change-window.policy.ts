import { Role } from '../../../shared/auth/role.js';
import { changeWindowExpiredException } from '../exceptions.js';
import { firstActiveItem, type TimedItem } from './item-collision.js';

const DEFAULT_WINDOW_HOURS = 48;

export function changeDeadline(
  firstActiveItemStartsAt: Date,
  windowHours: number = DEFAULT_WINDOW_HOURS,
): Date {
  return new Date(firstActiveItemStartsAt.getTime() - windowHours * 60 * 60_000);
}

export function canClientChange(
  now: Date,
  firstActiveItemStartsAt: Date,
  windowHours: number = DEFAULT_WINDOW_HOURS,
): boolean {
  return now.getTime() <= changeDeadline(firstActiveItemStartsAt, windowHours).getTime();
}

export function assertClientCanChange(
  actorRole: Role,
  items: TimedItem[],
  now: Date,
  windowHours: number = DEFAULT_WINDOW_HOURS,
): void {
  if (actorRole !== Role.CLIENT) {
    return;
  }
  const first = firstActiveItem(items);
  if (first && !canClientChange(now, first.startsAt, windowHours)) {
    throw changeWindowExpiredException();
  }
}
