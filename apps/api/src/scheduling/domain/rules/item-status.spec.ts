import { isValidItemTransition, ItemStatus } from './item-status.js';

describe('isValidItemTransition', () => {
  it.each([
    [ItemStatus.PENDING, ItemStatus.CONFIRMED],
    [ItemStatus.PENDING, ItemStatus.CANCELLED],
    [ItemStatus.CONFIRMED, ItemStatus.CANCELLED],
    [ItemStatus.CONFIRMED, ItemStatus.IN_PROGRESS],
    [ItemStatus.CONFIRMED, ItemStatus.COMPLETED],
    [ItemStatus.CONFIRMED, ItemStatus.NO_SHOW],
    [ItemStatus.IN_PROGRESS, ItemStatus.COMPLETED],
  ])('accepts %s -> %s', (from, to) => {
    expect(isValidItemTransition(from, to)).toBe(true);
  });

  it.each([
    [ItemStatus.PENDING, ItemStatus.IN_PROGRESS],
    [ItemStatus.PENDING, ItemStatus.COMPLETED],
    [ItemStatus.PENDING, ItemStatus.NO_SHOW],
    [ItemStatus.IN_PROGRESS, ItemStatus.CANCELLED],
    [ItemStatus.IN_PROGRESS, ItemStatus.NO_SHOW],
    [ItemStatus.IN_PROGRESS, ItemStatus.PENDING],
    [ItemStatus.COMPLETED, ItemStatus.PENDING],
    [ItemStatus.COMPLETED, ItemStatus.CANCELLED],
    [ItemStatus.CANCELLED, ItemStatus.PENDING],
    [ItemStatus.NO_SHOW, ItemStatus.COMPLETED],
  ])('rejects %s -> %s', (from, to) => {
    expect(isValidItemTransition(from, to)).toBe(false);
  });

  it('rejects staying in the same status', () => {
    for (const status of Object.values(ItemStatus)) {
      expect(isValidItemTransition(status, status)).toBe(false);
    }
  });

  it('has no outgoing transitions from the terminal statuses', () => {
    for (const status of [
      ItemStatus.COMPLETED,
      ItemStatus.CANCELLED,
      ItemStatus.NO_SHOW,
    ]) {
      for (const target of Object.values(ItemStatus)) {
        expect(isValidItemTransition(status, target)).toBe(false);
      }
    }
  });
});
