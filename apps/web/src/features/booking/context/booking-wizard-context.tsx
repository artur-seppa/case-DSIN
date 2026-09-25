import { createContext, useContext, type ReactNode } from 'react';
import {
  useBookingWizardReducer,
  type BookingWizardState,
  type BookingItem,
} from '@/features/booking/hooks/use-booking-wizard';

interface BookingWizardContextValue {
  state: BookingWizardState;
  toggleService: (service: { id: string; name: string; durationMinutes: number; priceCents: number }) => void;
  setProfessional: (serviceId: string, professionalId: string | null, professionalName: string | null) => void;
  goToStep: (step: 1 | 2 | 3) => void;
  setSchedule: (date: string, startsAt: string) => void;
  setNotes: (notes: string) => void;
  reset: () => void;
}

const BookingWizardContext = createContext<BookingWizardContextValue | null>(null);

export function BookingWizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useBookingWizardReducer();

  const value: BookingWizardContextValue = {
    state,
    toggleService: (service) => dispatch({ type: 'TOGGLE_SERVICE', service }),
    setProfessional: (serviceId, professionalId, professionalName) =>
      dispatch({ type: 'SET_PROFESSIONAL', serviceId, professionalId, professionalName }),
    goToStep: (step) => dispatch({ type: 'GO_TO_STEP', step }),
    setSchedule: (date, startsAt) => dispatch({ type: 'SET_SCHEDULE', date, startsAt }),
    setNotes: (notes) => dispatch({ type: 'SET_NOTES', notes }),
    reset: () => dispatch({ type: 'RESET' }),
  };

  return <BookingWizardContext.Provider value={value}>{children}</BookingWizardContext.Provider>;
}

export function useBookingWizard(): BookingWizardContextValue {
  const context = useContext(BookingWizardContext);
  if (!context) {
    throw new Error('useBookingWizard must be used within a BookingWizardProvider');
  }
  return context;
}

export type { BookingItem };
