import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import { CurrentUser, Roles } from '../../../shared/auth/decorators.js';
import { Role } from '../../../shared/auth/role.js';
import { ParseUlidPipe } from '../../../shared/http/parse-ulid.pipe.js';
import { Serialize } from '../../../shared/http/serialize.js';
import type { Page } from '../../../shared/pagination/page.js';
import type { ItemStatus } from '../../domain/rules/item-status.js';
import { AddItemUseCase } from '../../application/use-cases/add-item.use-case.js';
import { CancelAppointmentUseCase } from '../../application/use-cases/cancel-appointment.use-case.js';
import { CancelItemUseCase } from '../../application/use-cases/cancel-item.use-case.js';
import { ChangeItemStatusUseCase } from '../../application/use-cases/change-item-status.use-case.js';
import { ConfirmAppointmentUseCase } from '../../application/use-cases/confirm-appointment.use-case.js';
import { CreateAppointmentUseCase } from '../../application/use-cases/create-appointment.use-case.js';
import { GetAppointmentHistoryUseCase } from '../../application/use-cases/get-appointment-history.use-case.js';
import { GetAppointmentUseCase } from '../../application/use-cases/get-appointment.use-case.js';
import { ListAppointmentsUseCase } from '../../application/use-cases/list-appointments.use-case.js';
import { RepositionItemUseCase } from '../../application/use-cases/reposition-item.use-case.js';
import { AppointmentDetailAssembler, type AppointmentDetail } from '../../application/appointment-detail.assembler.js';
import { AddItemDto } from './dto/add-item.dto.js';
import { AppointmentHistoryEntryResponse } from './dto/appointment-history.response.js';
import { AppointmentPageResponse, AppointmentResponse } from './dto/appointment.response.js';
import { CancelDto } from './dto/cancel.dto.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { ListAppointmentsQuery } from './dto/list-appointments.query.js';
import { RepositionItemDto } from './dto/reposition-item.dto.js';
import { ParseItemStatusPipe } from './parse-item-status.pipe.js';

@ApiTags('appointments')
@ApiCookieAuth()
@ApiSecurity('csrf')
@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly createAppointment: CreateAppointmentUseCase,
    private readonly listAppointments: ListAppointmentsUseCase,
    private readonly getAppointment: GetAppointmentUseCase,
    private readonly getHistory: GetAppointmentHistoryUseCase,
    private readonly addItem: AddItemUseCase,
    private readonly repositionItem: RepositionItemUseCase,
    private readonly confirmAppointment: ConfirmAppointmentUseCase,
    private readonly cancelAppointment: CancelAppointmentUseCase,
    private readonly changeItemStatus: ChangeItemStatusUseCase,
    private readonly cancelItem: CancelItemUseCase,
    private readonly assembler: AppointmentDetailAssembler,
  ) {}

  @Roles([Role.CLIENT])
  @Post()
  @Serialize(AppointmentResponse, { status: HttpStatus.CREATED })
  @ApiOperation({ summary: 'Cria um agendamento (cliente)' })
  async create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: CreateAppointmentDto,
  ): Promise<AppointmentDetail> {
    const aggregate = await this.createAppointment.execute({
      clientId: actor.id,
      startsAt: body.startsAt,
      notes: body.notes,
      items: body.items,
    });
    return this.assembler.assemble(aggregate);
  }

  @Get()
  @Serialize(AppointmentPageResponse)
  @ApiOperation({ summary: 'Lista agendamentos (cliente: os seus; administrador: todos)' })
  list(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ListAppointmentsQuery,
  ): Promise<Page<AppointmentDetail>> {
    return this.listAppointments.execute(
      {
        from: query.from,
        to: query.to,
        itemStatuses: query.itemStatus,
        professionalId: query.professionalId,
        serviceId: query.serviceId,
        clientId: query.clientId,
        q: query.q,
        sort: query.sort,
        order: query.order,
      },
      query,
      actor,
    );
  }

  @Get(':id')
  @Serialize(AppointmentResponse)
  @ApiOperation({ summary: 'Detalhe do agendamento' })
  detail(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUlidPipe) id: string,
  ): Promise<AppointmentDetail> {
    return this.getAppointment.execute(id, actor);
  }

  @Roles([Role.ADMIN])
  @Get(':id/history')
  @Serialize(AppointmentHistoryEntryResponse, { isArray: true })
  @ApiOperation({ summary: 'Linha do tempo do agendamento (administrador)' })
  history(@Param('id', ParseUlidPipe) id: string) {
    return this.getHistory.execute(id);
  }

  @Post(':id/items')
  @HttpCode(HttpStatus.OK)
  @Serialize(AppointmentResponse)
  @ApiOperation({ summary: 'Adiciona um item ao agendamento (dono na janela / administrador)' })
  addAppointmentItem(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUlidPipe) id: string,
    @Body() body: AddItemDto,
  ): Promise<AppointmentDetail> {
    return this.addItem.execute({
      appointmentId: id,
      actor,
      serviceId: body.serviceId,
      professionalId: body.professionalId,
      startsAt: body.startsAt,
    });
  }

  @Patch(':id/items/:itemId')
  @Serialize(AppointmentResponse)
  @ApiOperation({ summary: 'Reposiciona um item do agendamento (dono na janela / administrador)' })
  repositionAppointmentItem(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUlidPipe) id: string,
    @Param('itemId', ParseUlidPipe) itemId: string,
    @Body() body: RepositionItemDto,
  ): Promise<AppointmentDetail> {
    return this.repositionItem.execute({
      appointmentId: id,
      itemId,
      actor,
      startsAt: body.startsAt,
      professionalId: body.professionalId,
    });
  }

  @Roles([Role.ADMIN])
  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @Serialize(AppointmentResponse)
  @ApiOperation({ summary: 'Confirma todos os itens aguardando confirmação (administrador)' })
  confirm(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUlidPipe) id: string,
  ): Promise<AppointmentDetail> {
    return this.confirmAppointment.execute(id, actor.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Serialize(AppointmentResponse)
  @ApiOperation({ summary: 'Cancela o agendamento (dono na janela / administrador)' })
  cancel(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUlidPipe) id: string,
    @Body() body: CancelDto,
  ): Promise<AppointmentDetail> {
    return this.cancelAppointment.execute({ appointmentId: id, actor, reason: body.reason });
  }

  @Roles([Role.ADMIN])
  @Post(':id/items/:itemId/:status')
  @HttpCode(HttpStatus.OK)
  @Serialize(AppointmentResponse)
  @ApiParam({
    name: 'status',
    enum: ['confirmed', 'in-progress', 'completed', 'no-show'],
    description: 'Transição operacional do item (administrador)',
  })
  @ApiOperation({ summary: 'Muda o status operacional de um item (administrador)' })
  changeStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUlidPipe) id: string,
    @Param('itemId', ParseUlidPipe) itemId: string,
    @Param('status', ParseItemStatusPipe) targetStatus: ItemStatus,
  ): Promise<AppointmentDetail> {
    return this.changeItemStatus.execute({
      appointmentId: id,
      itemId,
      actorId: actor.id,
      targetStatus,
    });
  }

  @Post(':id/items/:itemId/cancel')
  @HttpCode(HttpStatus.OK)
  @Serialize(AppointmentResponse)
  @ApiOperation({ summary: 'Cancela um item (dono na janela / administrador)' })
  cancelAppointmentItem(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUlidPipe) id: string,
    @Param('itemId', ParseUlidPipe) itemId: string,
    @Body() body: CancelDto,
  ): Promise<AppointmentDetail> {
    return this.cancelItem.execute({
      appointmentId: id,
      itemId,
      actor,
      reason: body.reason,
    });
  }
}
