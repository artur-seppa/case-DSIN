import {
  ConflictException,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ChainIssue } from './rules/availability-calculator.js';

export class SlotTakenException extends ConflictException {
  constructor() {
    super({
      statusCode: HttpStatus.CONFLICT,
      code: 'SLOT_TAKEN',
      message: 'O horário acabou de ser ocupado. Escolha outro',
    });
  }
}

export class InvalidStatusTransitionException extends ConflictException {
  constructor(message: string) {
    super({
      statusCode: HttpStatus.CONFLICT,
      code: 'INVALID_STATUS_TRANSITION',
      message,
    });
  }
}

export class SchedulingRuleViolationException extends UnprocessableEntityException {
  constructor(code: string, message: string) {
    super({ statusCode: HttpStatus.UNPROCESSABLE_ENTITY, code, message });
  }
}

export function changeWindowExpiredException(): SchedulingRuleViolationException {
  return new SchedulingRuleViolationException(
    'CHANGE_WINDOW_EXPIRED',
    'Alterações só até 48 h antes do primeiro horário. Ligue para o salão',
  );
}

export function outsideWorkingHoursException(): SchedulingRuleViolationException {
  return new SchedulingRuleViolationException(
    'OUTSIDE_WORKING_HOURS',
    'O horário escolhido não cabe no expediente do profissional',
  );
}

export function leadTimeTooShortException(): SchedulingRuleViolationException {
  return new SchedulingRuleViolationException(
    'LEAD_TIME_TOO_SHORT',
    'É preciso agendar com pelo menos 2 h de antecedência',
  );
}

export function professionalDoesNotOfferServiceException(): SchedulingRuleViolationException {
  return new SchedulingRuleViolationException(
    'PROFESSIONAL_DOES_NOT_OFFER_SERVICE',
    'O profissional escolhido não executa este serviço',
  );
}

export function itemsOverlapException(): SchedulingRuleViolationException {
  return new SchedulingRuleViolationException(
    'ITEMS_OVERLAP',
    'Os horários escolhidos se sobrepõem',
  );
}

export function dateOutOfRangeException(): SchedulingRuleViolationException {
  return new SchedulingRuleViolationException(
    'DATE_OUT_OF_RANGE',
    'A data escolhida está fora do período permitido para agendamento',
  );
}

export function invalidGridStartException(): SchedulingRuleViolationException {
  return new SchedulingRuleViolationException(
    'INVALID_GRID_START',
    'O horário escolhido deve cair na grade de 30 minutos',
  );
}

export function chainIssueException(
  issue: ChainIssue,
): SchedulingRuleViolationException | ConflictException {
  switch (issue) {
    case 'DATE_OUT_OF_RANGE':
      return dateOutOfRangeException();
    case 'OUTSIDE_WORKING_HOURS':
      return outsideWorkingHoursException();
    case 'LEAD_TIME_TOO_SHORT':
      return leadTimeTooShortException();
    case 'SLOT_TAKEN':
      return new SlotTakenException();
  }
}
