import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import { CurrentUser } from '../../../shared/auth/decorators.js';
import { Role } from '../../../shared/auth/role.js';
import { Serialize } from '../../../shared/http/serialize.js';
import { GetAvailabilityUseCase } from '../../application/use-cases/get-availability.use-case.js';
import { AvailabilityQuery } from './dto/availability.query.js';
import { AvailabilityResponse } from './dto/availability.response.js';

@ApiTags('availability')
@ApiCookieAuth()
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly getAvailability: GetAvailabilityUseCase) {}

  @Get()
  @Serialize(AvailabilityResponse)
  @ApiOperation({
    summary: 'Horários de início disponíveis para uma cadeia de itens em uma data',
  })
  get(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: AvailabilityQuery,
  ) {
    const suggestSameWeek = actor.role === Role.CLIENT && !query.appointmentId;
    return this.getAvailability.execute({
      date: query.date,
      items: query.items,
      excludeItemId: query.excludeItemId,
      suggestSameWeekForClientId: suggestSameWeek ? actor.id : undefined,
    });
  }
}
