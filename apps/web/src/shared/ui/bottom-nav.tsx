import { Link } from '@tanstack/react-router';

const TAB_LAYOUT_CLASS = 'flex flex-1 flex-col items-center justify-center gap-0.5';
const TAB_INACTIVE_CLASS = 'text-text-secondary';
const TAB_ACTIVE_CLASS = 'text-accent-700 font-semibold';

export function BottomNav() {
  return (
    <nav aria-label="Navegação principal" 
    className="sticky bottom-0 z-50 flex h-16 flex-shrink-0 border-t border-border bg-bg-surface"
  >
      <Link
        to="/book"
        className={TAB_LAYOUT_CLASS}
        inactiveProps={{ className: TAB_INACTIVE_CLASS }}
        activeProps={{ className: TAB_ACTIVE_CLASS }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v4M16 3v4" />
        </svg>
        <span className="text-micro">Agendar</span>
      </Link>
      <Link
        to="/appointments"
        className={TAB_LAYOUT_CLASS}
        inactiveProps={{ className: TAB_INACTIVE_CLASS }}
        activeProps={{ className: TAB_ACTIVE_CLASS }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="text-micro">Agendamentos</span>
      </Link>
      <Link
        to="/profile"
        className={TAB_LAYOUT_CLASS}
        inactiveProps={{ className: TAB_INACTIVE_CLASS }}
        activeProps={{ className: TAB_ACTIVE_CLASS }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
        </svg>
        <span className="text-micro">Perfil</span>
      </Link>
    </nav>
  );
}
