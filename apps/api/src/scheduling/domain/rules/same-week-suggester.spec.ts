import { findSameWeekDate } from './same-week-suggester.js';

describe('findSameWeekDate', () => {
  it('finds another date in the same Monday-Sunday week', () => {
    // 2026-10-01 is a Thursday; that week runs 2026-09-28 (Mon) to 2026-10-04 (Sun).
    expect(findSameWeekDate('2026-10-01', ['2026-09-30'])).toBe('2026-09-30');
  });

  it('ignores dates in a different week', () => {
    expect(findSameWeekDate('2026-10-01', ['2026-10-08'])).toBeNull();
  });

  it('ignores the date itself', () => {
    expect(findSameWeekDate('2026-10-01', ['2026-10-01'])).toBeNull();
  });

  it('picks the closest same-week date when there is more than one', () => {
    expect(
      findSameWeekDate('2026-10-01', ['2026-09-28', '2026-09-30']),
    ).toBe('2026-09-30');
  });

  it('treats Sunday and the following Monday as different weeks', () => {
    expect(findSameWeekDate('2026-10-04', ['2026-10-05'])).toBeNull();
  });

  it('returns null when there are no candidates', () => {
    expect(findSameWeekDate('2026-10-01', [])).toBeNull();
  });
});
