import { InvalidWorkingHoursException } from './exceptions.js';
import { assertValidWorkingWindows } from './working-hours.policy.js';

const window = (weekday: number, startTime: string, endTime: string) => ({
  weekday,
  startTime,
  endTime,
});

function messageOf(windows: ReturnType<typeof window>[]): string {
  try {
    assertValidWorkingWindows(windows);
  } catch (error) {
    return (
      (error as InvalidWorkingHoursException).getResponse() as {
        message: string;
      }
    ).message;
  }
  return '';
}

describe('assertValidWorkingWindows', () => {
  it('accepts an empty schedule (clears the working hours)', () => {
    expect(() => assertValidWorkingWindows([])).not.toThrow();
  });

  it('accepts a lunch break: two windows in the same day', () => {
    expect(() =>
      assertValidWorkingWindows([
        window(1, '09:00', '12:00'),
        window(1, '14:00', '18:00'),
      ]),
    ).not.toThrow();
  });

  it('accepts windows that only touch each other', () => {
    expect(() =>
      assertValidWorkingWindows([
        window(2, '09:00', '12:00'),
        window(2, '12:00', '18:00'),
      ]),
    ).not.toThrow();
  });

  it('accepts the same hours on different weekdays, in any order', () => {
    expect(() =>
      assertValidWorkingWindows([
        window(3, '09:00', '18:00'),
        window(1, '09:00', '18:00'),
        window(7, '09:00', '18:00'),
      ]),
    ).not.toThrow();
  });

  it('rejects overlapping windows of the same day, regardless of the order given', () => {
    expect(
      messageOf([window(1, '13:00', '18:00'), window(1, '09:00', '14:00')]),
    ).toBe('As faixas de horário de um mesmo dia não podem se sobrepor');
  });

  it('rejects a window whose start is not before its end', () => {
    const expected = 'O horário de início deve ser anterior ao de término';

    expect(messageOf([window(1, '10:00', '10:00')])).toBe(expected);
    expect(messageOf([window(1, '18:00', '09:00')])).toBe(expected);
  });

  it.each([0, 8, -1, 1.5])('rejects the weekday %s', (weekday) => {
    expect(messageOf([window(weekday, '09:00', '18:00')])).toBe(
      'Dia da semana deve estar entre 1 (segunda) e 7 (domingo)',
    );
  });

  it.each(['9:00', '24:00', '09:60', '0900', '09:00:00', ''])(
    'rejects the malformed time %j',
    (time) => {
      expect(messageOf([window(1, time, '18:00')])).toBe(
        'Horário deve estar no formato HH:MM',
      );
    },
  );

  it('reports the failure as an unprocessable entity with a stable code', () => {
    try {
      assertValidWorkingWindows([window(1, '10:00', '09:00')]);
      throw new Error('expected a failure');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidWorkingHoursException);
      expect((error as InvalidWorkingHoursException).getStatus()).toBe(422);
      expect(
        (error as InvalidWorkingHoursException).getResponse(),
      ).toMatchObject({ code: 'INVALID_WORKING_HOURS' });
    }
  });
});
