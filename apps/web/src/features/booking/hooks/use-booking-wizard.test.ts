import { bookingWizardReducer, initialBookingWizardState } from '@/features/booking/hooks/use-booking-wizard';

const CORTE = { id: 'svc-corte', name: 'Corte feminino', durationMinutes: 45, priceCents: 8000 };
const ESCOVA = { id: 'svc-escova', name: 'Escova', durationMinutes: 30, priceCents: 5000 };

describe('bookingWizardReducer', () => {
  it('adds a service when toggled on', () => {
    const state = bookingWizardReducer(initialBookingWizardState, {
      type: 'TOGGLE_SERVICE',
      service: CORTE,
    });

    expect(state.items).toEqual([
      { serviceId: 'svc-corte', serviceName: 'Corte feminino', durationMinutes: 45, priceCents: 8000, professionalId: null, professionalName: null },
    ]);
  });

  it('removes a service when toggled off', () => {
    const withService = bookingWizardReducer(initialBookingWizardState, {
      type: 'TOGGLE_SERVICE',
      service: CORTE,
    });
    const withoutService = bookingWizardReducer(withService, { type: 'TOGGLE_SERVICE', service: CORTE });

    expect(withoutService.items).toEqual([]);
  });

  it('appends newly toggled services after existing ones', () => {
    let state = bookingWizardReducer(initialBookingWizardState, { type: 'TOGGLE_SERVICE', service: CORTE });
    state = bookingWizardReducer(state, { type: 'TOGGLE_SERVICE', service: ESCOVA });

    expect(state.items.map((item) => item.serviceId)).toEqual(['svc-corte', 'svc-escova']);
  });

  it('sets the professional for a specific item without touching others', () => {
    let state = bookingWizardReducer(initialBookingWizardState, { type: 'TOGGLE_SERVICE', service: CORTE });
    state = bookingWizardReducer(state, { type: 'TOGGLE_SERVICE', service: ESCOVA });
    state = bookingWizardReducer(state, {
      type: 'SET_PROFESSIONAL',
      serviceId: 'svc-corte',
      professionalId: 'prof-1',
      professionalName: 'Bia',
    });

    expect(state.items[0]).toMatchObject({ professionalId: 'prof-1', professionalName: 'Bia' });
    expect(state.items[1]).toMatchObject({ professionalId: null, professionalName: null });
  });

  it('blocks going to step 2 with no items selected', () => {
    const state = bookingWizardReducer(initialBookingWizardState, { type: 'GO_TO_STEP', step: 2 });

    expect(state.step).toBe(1);
  });

  it('blocks going to step 2 when an item has no professional yet', () => {
    const withService = bookingWizardReducer(initialBookingWizardState, {
      type: 'TOGGLE_SERVICE',
      service: CORTE,
    });
    const state = bookingWizardReducer(withService, { type: 'GO_TO_STEP', step: 2 });

    expect(state.step).toBe(1);
  });

  it('allows going to step 2 once every item has a professional', () => {
    let state = bookingWizardReducer(initialBookingWizardState, { type: 'TOGGLE_SERVICE', service: CORTE });
    state = bookingWizardReducer(state, {
      type: 'SET_PROFESSIONAL',
      serviceId: 'svc-corte',
      professionalId: 'prof-1',
      professionalName: 'Bia',
    });
    state = bookingWizardReducer(state, { type: 'GO_TO_STEP', step: 2 });

    expect(state.step).toBe(2);
  });

  it('blocks going to step 3 with no schedule chosen', () => {
    let state = bookingWizardReducer(initialBookingWizardState, { type: 'TOGGLE_SERVICE', service: CORTE });
    state = bookingWizardReducer(state, {
      type: 'SET_PROFESSIONAL',
      serviceId: 'svc-corte',
      professionalId: 'prof-1',
      professionalName: 'Bia',
    });
    state = bookingWizardReducer(state, { type: 'GO_TO_STEP', step: 3 });

    expect(state.step).toBe(1);
  });

  it('sets the date and chosen start time', () => {
    const state = bookingWizardReducer(initialBookingWizardState, {
      type: 'SET_SCHEDULE',
      date: '2026-10-01',
      startsAt: '2026-10-01T18:00:00Z',
    });

    expect(state.date).toBe('2026-10-01');
    expect(state.startsAt).toBe('2026-10-01T18:00:00Z');
  });

  it('sets notes', () => {
    const state = bookingWizardReducer(initialBookingWizardState, {
      type: 'SET_NOTES',
      notes: 'Alergia a amônia',
    });

    expect(state.notes).toBe('Alergia a amônia');
  });

  it('resets to the initial state', () => {
    let state = bookingWizardReducer(initialBookingWizardState, { type: 'TOGGLE_SERVICE', service: CORTE });
    state = bookingWizardReducer(state, { type: 'SET_NOTES', notes: 'x' });
    state = bookingWizardReducer(state, { type: 'RESET' });

    expect(state).toEqual(initialBookingWizardState);
  });
});
