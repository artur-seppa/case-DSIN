import { canClientChange, changeDeadline } from './change-window.policy.js';

describe('changeDeadline', () => {
  it('is 48 hours before the first active item by default', () => {
    expect(changeDeadline(new Date('2026-10-10T10:00:00Z'))).toEqual(
      new Date('2026-10-08T10:00:00Z'),
    );
  });

  it('accepts a custom window', () => {
    expect(changeDeadline(new Date('2026-10-10T10:00:00Z'), 24)).toEqual(
      new Date('2026-10-09T10:00:00Z'),
    );
  });
});

describe('canClientChange', () => {
  const startsAt = new Date('2026-10-10T10:00:00Z');

  it('allows changes measured on the current situation, up to and including the deadline', () => {
    expect(canClientChange(new Date('2026-10-08T09:00:00Z'), startsAt)).toBe(true);
    expect(canClientChange(new Date('2026-10-08T10:00:00Z'), startsAt)).toBe(true);
  });

  it('forbids changes past the deadline', () => {
    expect(canClientChange(new Date('2026-10-08T10:00:01Z'), startsAt)).toBe(false);
    expect(canClientChange(new Date('2026-10-09T00:00:00Z'), startsAt)).toBe(false);
  });
});
