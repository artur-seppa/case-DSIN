import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import { CurrentUser, Roles } from '../../../shared/auth/decorators.js';
import { Role } from '../../../shared/auth/role.js';
import { canSeeInactive } from '../../../shared/auth/visibility.js';
import type { Page } from '../../../shared/pagination/page.js';
import { ParseUlidPipe } from '../../../shared/http/parse-ulid.pipe.js';
import { Serialize } from '../../../shared/http/serialize.js';
import type { Professional } from '../../domain/professional.entity.js';
import { CreateProfessionalUseCase } from '../../application/use-cases/create-professional.use-case.js';
import { GetProfessionalUseCase } from '../../application/use-cases/get-professional.use-case.js';
import { ListProfessionalsUseCase } from '../../application/use-cases/list-professionals.use-case.js';
import { SetProfessionalServicesUseCase } from '../../application/use-cases/set-professional-services.use-case.js';
import { SetProfessionalWorkingHoursUseCase } from '../../application/use-cases/set-professional-working-hours.use-case.js';
import { UpdateProfessionalUseCase } from '../../application/use-cases/update-professional.use-case.js';
import { CreateProfessionalDto } from './dto/create-professional.dto.js';
import { ListProfessionalsQuery } from './dto/list-professionals.query.js';
import {
  ProfessionalDetailResponse,
  ProfessionalPageResponse,
  ProfessionalResponse,
} from './dto/professional.response.js';
import { SetServicesDto } from './dto/set-services.dto.js';
import { SetWorkingHoursDto } from './dto/set-working-hours.dto.js';
import { UpdateProfessionalDto } from './dto/update-professional.dto.js';

@ApiTags('professionals')
@ApiCookieAuth()
@ApiSecurity('csrf')
@Controller('professionals')
export class ProfessionalsController {
  constructor(
    private readonly createProfessional: CreateProfessionalUseCase,
    private readonly updateProfessional: UpdateProfessionalUseCase,
    private readonly listProfessionals: ListProfessionalsUseCase,
    private readonly getProfessional: GetProfessionalUseCase,
    private readonly setServices: SetProfessionalServicesUseCase,
    private readonly setWorkingHours: SetProfessionalWorkingHoursUseCase,
  ) {}

  @Get()
  @Serialize(ProfessionalPageResponse)
  @ApiOperation({
    summary:
      'Lista os profissionais, paginada (opcionalmente os que fazem um serviço)',
  })
  async list(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ListProfessionalsQuery,
  ): Promise<Page<Professional>> {
    return this.listProfessionals.execute(
      {
        includeInactive: canSeeInactive(actor, query.includeInactive),
        serviceId: query.serviceId,
      },
      query,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalhe: serviços que executa e expediente semanal',
  })
  async detail(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUlidPipe) id: string,
  ): Promise<ProfessionalDetailResponse> {
    return this.loadDetail(id, canSeeInactive(actor, true));
  }

  @Roles([Role.ADMIN])
  @Post()
  @Serialize(ProfessionalResponse, { status: HttpStatus.CREATED })
  @ApiOperation({ summary: 'Cadastra um profissional (administrador)' })
  create(@Body() body: CreateProfessionalDto): Promise<Professional> {
    return this.createProfessional.execute(body);
  }

  @Roles([Role.ADMIN])
  @Patch(':id')
  @Serialize(ProfessionalResponse)
  @ApiOperation({
    summary: 'Altera ou ativa/desativa um profissional (administrador)',
  })
  async update(
    @Param('id', ParseUlidPipe) id: string,
    @Body() body: UpdateProfessionalDto,
  ): Promise<Professional> {
    return this.updateProfessional.execute(id, body);
  }

  @Roles([Role.ADMIN])
  @Put(':id/services')
  @ApiOperation({
    summary: 'Define os serviços que o profissional executa (administrador)',
  })
  async replaceServices(
    @Param('id', ParseUlidPipe) id: string,
    @Body() body: SetServicesDto,
  ): Promise<ProfessionalDetailResponse> {
    return ProfessionalDetailResponse.fromDetail(
      await this.setServices.execute({
        professionalId: id,
        serviceIds: body.serviceIds,
      }),
    );
  }

  @Roles([Role.ADMIN])
  @Put(':id/working-hours')
  @ApiOperation({
    summary: 'Define o expediente semanal do profissional (administrador)',
  })
  async replaceWorkingHours(
    @Param('id', ParseUlidPipe) id: string,
    @Body() body: SetWorkingHoursDto,
  ): Promise<ProfessionalDetailResponse> {
    return ProfessionalDetailResponse.fromDetail(
      await this.setWorkingHours.execute({
        professionalId: id,
        windows: body.windows,
      }),
    );
  }

  private async loadDetail(
    professionalId: string,
    includeInactive: boolean,
  ): Promise<ProfessionalDetailResponse> {
    const detail = await this.getProfessional.execute({
      professionalId,
      includeInactive,
    });
    return ProfessionalDetailResponse.fromDetail(detail);
  }
}
