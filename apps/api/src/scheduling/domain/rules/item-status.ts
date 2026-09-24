export enum ItemStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

const VALID_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  [ItemStatus.PENDING]: [ItemStatus.CONFIRMED, ItemStatus.CANCELLED],
  [ItemStatus.CONFIRMED]: [
    ItemStatus.IN_PROGRESS,
    ItemStatus.COMPLETED,
    ItemStatus.NO_SHOW,
    ItemStatus.CANCELLED,
  ],
  [ItemStatus.IN_PROGRESS]: [ItemStatus.COMPLETED],
  [ItemStatus.COMPLETED]: [],
  [ItemStatus.CANCELLED]: [],
  [ItemStatus.NO_SHOW]: [],
};

export function isValidItemTransition(
  from: ItemStatus,
  to: ItemStatus,
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
