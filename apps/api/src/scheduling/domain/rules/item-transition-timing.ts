import { localDaysBetween, zonedPartsOf } from '../../../shared/time/utc-offset.js';
import { InvalidStatusTransitionException } from '../exceptions.js';
import { ItemStatus } from './item-status.js';

export function assertItemTransitionTiming(
  from: ItemStatus,
  to: ItemStatus,
  item: { startsAt: Date },
  now: Date,
  utcOffsetMinutes: number,
): void {
  const requiresAppointmentDay =
    to === ItemStatus.IN_PROGRESS || (from === ItemStatus.CONFIRMED && to === ItemStatus.COMPLETED);
  if (requiresAppointmentDay) {
    // Compare local calendar days, not instants: "today" in the salon's time.
    const localToday = zonedPartsOf(now, utcOffsetMinutes);
    const localAppointmentDay = zonedPartsOf(item.startsAt, utcOffsetMinutes);
    if (localDaysBetween(localAppointmentDay, localToday) < 0) {
      throw new InvalidStatusTransitionException(
        'Só é possível iniciar ou concluir o atendimento a partir do dia agendado',
      );
    }
  }

  if (to === ItemStatus.NO_SHOW && now.getTime() <= item.startsAt.getTime()) {
    throw new InvalidStatusTransitionException(
      'Só é possível marcar falta depois do horário do item',
    );
  }
}
