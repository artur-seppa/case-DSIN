import { useReducer } from 'react';

export interface BookingItem {
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  priceCents: number;
  professionalId: string | null;
  professionalName: string | null;
}

export interface BookingWizardState {
  step: 1 | 2 | 3;
  items: BookingItem[];
  date: string | null;
  startsAt: string | null;
  notes: string;
}

export type BookingWizardAction =
  | { type: 'TOGGLE_SERVICE'; service: { id: string; name: string; durationMinutes: number; priceCents: number } }
  | { type: 'SET_PROFESSIONAL'; serviceId: string; professionalId: string | null; professionalName: string | null }
  | { type: 'GO_TO_STEP'; step: 1 | 2 | 3 }
  | { type: 'SET_SCHEDULE'; date: string; startsAt: string }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'RESET' };

export const initialBookingWizardState: BookingWizardState = {
  step: 1,
  items: [],
  date: null,
  startsAt: null,
  notes: '',
};

function canLeaveStep1(state: BookingWizardState): boolean {
  return state.items.length > 0 && state.items.every((item) => item.professionalId !== null);
}

function canLeaveStep2(state: BookingWizardState): boolean {
  return state.date !== null && state.startsAt !== null;
}

export function bookingWizardReducer(
  state: BookingWizardState,
  action: BookingWizardAction,
): BookingWizardState {
  switch (action.type) {
    case 'TOGGLE_SERVICE': {
      const exists = state.items.some((item) => item.serviceId === action.service.id);
      if (exists) {
        return { ...state, items: state.items.filter((item) => item.serviceId !== action.service.id) };
      }
      return {
        ...state,
        items: [
          ...state.items,
          {
            serviceId: action.service.id,
            serviceName: action.service.name,
            durationMinutes: action.service.durationMinutes,
            priceCents: action.service.priceCents,
            professionalId: null,
            professionalName: null,
          },
        ],
      };
    }
    case 'SET_PROFESSIONAL': {
      return {
        ...state,
        items: state.items.map((item) =>
          item.serviceId === action.serviceId
            ? { ...item, professionalId: action.professionalId, professionalName: action.professionalName }
            : item,
        ),
      };
    }
    case 'GO_TO_STEP': {
      if (action.step === 2 && !canLeaveStep1(state)) {
        return state;
      }
      if (action.step === 3 && !canLeaveStep2(state)) {
        return state;
      }
      return { ...state, step: action.step };
    }
    case 'SET_SCHEDULE': {
      return { ...state, date: action.date, startsAt: action.startsAt };
    }
    case 'SET_NOTES': {
      return { ...state, notes: action.notes };
    }
    case 'RESET': {
      return initialBookingWizardState;
    }
    default: {
      return state;
    }
  }
}

export function useBookingWizardReducer() {
  return useReducer(bookingWizardReducer, initialBookingWizardState);
}
