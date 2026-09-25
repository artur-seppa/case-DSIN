import type { BadgeVariant } from '@/shared/ui/badge';

export interface StatusInfo {
  label: string;
  variant: BadgeVariant;
}

export const appointmentStatusInfo: Record<string, StatusInfo> = {
  PENDING: { label: 'Aguardando confirmação', variant: 'warning' },
  CONFIRMED: { label: 'Confirmado', variant: 'success' },
  IN_PROGRESS: { label: 'Em andamento', variant: 'info' },
  FINISHED: { label: 'Concluído', variant: 'neutral' },
  CANCELLED: { label: 'Cancelado', variant: 'error' },
};

export const itemStatusInfo: Record<string, StatusInfo> = {
  PENDING: { label: 'Aguardando', variant: 'warning' },
  CONFIRMED: { label: 'Confirmado', variant: 'success' },
  IN_PROGRESS: { label: 'Em andamento', variant: 'info' },
  COMPLETED: { label: 'Concluído', variant: 'neutral' },
  CANCELLED: { label: 'Cancelado', variant: 'error' },
  NO_SHOW: { label: 'Faltou', variant: 'error' },
};

export const appointmentsLabels = {
  screenTitle: 'Meus agendamentos',
  tabUpcoming: 'Próximos',
  tabHistory: 'Histórico',
  tabCancelled: 'Cancelados',
  loadMore: 'Carregar mais',
  loading: 'Carregando…',
  empty: 'Nenhum agendamento por aqui ainda',
  backToList: 'Meus agendamentos',
  totalLabel: 'Total',
  changeWindowOpen: (deadline: string) => `Você pode alterar este agendamento até ${deadline}.`,
  changeWindowClosed: (deadline: string) =>
    `O prazo para alterar este agendamento (até ${deadline}) já passou. Ligue para o salão.`,
  loadErrorTitle: 'Não foi possível carregar',
  loadErrorRetry: 'Tentar novamente',
  reposition: 'Reposicionar',
  addService: 'Adicionar serviço',
  cancelAppointment: 'Cancelar agendamento',
  cancelConfirmQuestion: 'Cancelar este agendamento?',
  cancelConfirmYes: 'Sim, cancelar',
  cancelConfirmNo: 'Não',
  cancelReasonLabel: 'Motivo',
  cancelReasonOptionalHint: '(opcional)',
  cancelReasonPlaceholder: 'Ex.: imprevisto de última hora',
  cancelling: 'Cancelando…',
  cancelledReasonPrefix: 'Motivo: ',
  notFoundTitle: 'Agendamento não encontrado',
  notFoundHint: 'Ele pode ter sido removido, ou não pertence à sua conta.',
  cannotChangeTitle: 'Não é possível alterar',
  cannotChangeHint: 'O prazo para alterar este agendamento já passou, ou ele não está mais ativo.',
  addItemScreenTitle: 'Adicionar serviço',
  chooseServiceHint: 'Escolha o serviço',
  chooseTimeHint: 'Escolha o horário',
  addItemConfirm: 'Adicionar',
  addItemSubmitting: 'Adicionando…',
  addItemSuccess: 'Serviço adicionado',
  repositionScreenTitle: 'Reposicionar horário',
  repositionConfirm: 'Reposicionar',
  repositionSubmitting: 'Reposicionando…',
  repositionSuccess: 'Horário atualizado',
  keepCurrentProfessional: 'Manter profissional atual',
};
