import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
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
import type { Service } from '../../domain/service.entity.js';
import { CreateServiceUseCase } from '../../application/use-cases/create-service.use-case.js';
import { ListServicesUseCase } from '../../application/use-cases/list-services.use-case.js';
import { UpdateServiceUseCase } from '../../application/use-cases/update-service.use-case.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { ListServicesQuery } from './dto/list-services.query.js';
import {
  ServicePageResponse,
  ServiceResponse,
} from './dto/service.response.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';

@ApiTags('services')
@ApiCookieAuth()
@ApiSecurity('csrf')
@Controller('services')
export class ServicesController {
  constructor(
    private readonly createService: CreateServiceUseCase,
    private readonly updateService: UpdateServiceUseCase,
    private readonly listServices: ListServicesUseCase,
  ) {}

  @Get()
  @Serialize(ServicePageResponse)
  @ApiOperation({
    summary: 'Lista os serviços, paginada (inativos só para administradores)',
  })
  async list(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ListServicesQuery,
  ): Promise<Page<Service>> {
    return this.listServices.execute(
      { includeInactive: canSeeInactive(actor, query.includeInactive) },
      query,
    );
  }

  @Roles([Role.ADMIN])
  @Post()
  @Serialize(ServiceResponse, { status: HttpStatus.CREATED })
  @ApiOperation({ summary: 'Cadastra um serviço (administrador)' })
  create(@Body() body: CreateServiceDto): Promise<Service> {
    return this.createService.execute(body);
  }

  @Roles([Role.ADMIN])
  @Patch(':id')
  @Serialize(ServiceResponse)
  @ApiOperation({
    summary: 'Altera ou ativa/desativa um serviço (administrador)',
  })
  async update(
    @Param('id', ParseUlidPipe) id: string,
    @Body() body: UpdateServiceDto,
  ): Promise<Service> {
    return this.updateService.execute(id, body);
  }
}
