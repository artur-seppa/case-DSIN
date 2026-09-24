import { ItemStatus } from './item-status.js';

export interface TimedItem {
  startsAt: Date;
  endsAt: Date;
  status: ItemStatus;
}

export function overlapsAnyActiveItem(
  candidate: { startsAt: Date; endsAt: Date },
  items: TimedItem[],
): boolean {
  return items.some(
    (item) =>
      item.status !== ItemStatus.CANCELLED &&
      candidate.startsAt < item.endsAt &&
      item.startsAt < candidate.endsAt,
  );
}

export function firstActiveItem<T extends TimedItem>(items: T[]): T | null {
  const active = items.filter((item) => item.status !== ItemStatus.CANCELLED);
  if (active.length === 0) {
    return null;
  }
  return active.reduce((a, b) => (a.startsAt < b.startsAt ? a : b));
}
