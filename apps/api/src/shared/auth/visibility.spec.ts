import { Role } from './role.js';
import { canSeeInactive } from './visibility.js';

describe('canSeeInactive', () => {
  it('lets an ADMIN see inactive records only when asked', () => {
    expect(canSeeInactive({ id: 'a', role: Role.ADMIN }, true)).toBe(true);
    expect(canSeeInactive({ id: 'a', role: Role.ADMIN }, false)).toBe(false);
    expect(canSeeInactive({ id: 'a', role: Role.ADMIN }, undefined)).toBe(
      false,
    );
  });

  it('never lets a CLIENT see inactive records, even when asked', () => {
    expect(canSeeInactive({ id: 'c', role: Role.CLIENT }, true)).toBe(false);
  });
});
