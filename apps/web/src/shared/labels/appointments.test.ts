import { appointmentStatusInfo, itemStatusInfo } from '@/shared/labels/appointments';

const APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED'];
const ITEM_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

describe('appointmentStatusInfo', () => {
  it('has an entry for every known appointment status', () => {
    for (const status of APPOINTMENT_STATUSES) {
      expect(appointmentStatusInfo[status]).toBeDefined();
      expect(appointmentStatusInfo[status]!.label).not.toBe('');
    }
  });
});

describe('itemStatusInfo', () => {
  it('has an entry for every known item status', () => {
    for (const status of ITEM_STATUSES) {
      expect(itemStatusInfo[status]).toBeDefined();
      expect(itemStatusInfo[status]!.label).not.toBe('');
    }
  });
});
