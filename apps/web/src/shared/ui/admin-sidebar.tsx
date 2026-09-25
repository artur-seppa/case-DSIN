import { Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { client } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';

const LINK_CLASS = 'flex items-center gap-2 rounded-lg px-3 py-2 text-small font-medium text-text-secondary';
const LINK_ACTIVE_CLASS = 'flex items-center gap-2 rounded-lg px-3 py-2 text-small font-medium bg-accent-100 text-accent-700';

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="5" rx="1" />
      <rect x="13" y="12" width="8" height="9" rx="1" />
      <rect x="3" y="15" width="8" height="6" rx="1" />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

function ServicesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4L8.5 15.5M14.5 14.5L20 20M8.5 8.5L11 11" />
    </svg>
  );
}

function ProfessionalsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21c0-4 3-7 7-7s7 3 7 7" />
      <path d="M16 3.5c1.8.5 3 2.1 3 3.9s-1.2 3.4-3 3.9M23 21c0-3.2-2-5.8-5-6.7" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function AdminSidebar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleLogout() {
    try {
      await client.POST('/api/auth/logout');
    } finally {
      queryClient.clear();
      navigate({ to: '/login' });
    }
  }

  return (
    <nav
      aria-label="Navegação administrativa"
      className="sticky top-0 flex h-screen w-56 flex-shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-bg-surface p-4"
    >
      <span className="mb-4 font-display text-h3 font-semibold text-text-primary">Cabeleleila</span>

      <Link to="/admin" className={LINK_CLASS} activeProps={{ className: LINK_ACTIVE_CLASS }} activeOptions={{ exact: true }}>
        <DashboardIcon />
        Painel
      </Link>
      <Link to="/admin/queue" className={LINK_CLASS} activeProps={{ className: LINK_ACTIVE_CLASS }}>
        <QueueIcon />
        Fila
      </Link>
      <Link to="/admin/services" className={LINK_CLASS} activeProps={{ className: LINK_ACTIVE_CLASS }}>
        <ServicesIcon />
        Serviços
      </Link>
      <Link to="/admin/professionals" className={LINK_CLASS} activeProps={{ className: LINK_ACTIVE_CLASS }}>
        <ProfessionalsIcon />
        Profissionais
      </Link>

      <button
        type="button"
        onClick={handleLogout}
        className={cn(LINK_CLASS, 'mt-auto text-error-700 hover:bg-accent-100')}
      >
        <LogoutIcon />
        Sair
      </button>
    </nav>
  );
}
