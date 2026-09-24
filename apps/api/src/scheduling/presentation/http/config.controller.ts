import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../shared/auth/decorators.js';
import { Serialize } from '../../../shared/http/serialize.js';
import { GetConfigUseCase, type SchedulingConfig } from '../../application/use-cases/get-config.use-case.js';
import { ConfigResponse } from './dto/config.response.js';

@ApiTags('config')
@Controller('config')
export class ConfigController {
  constructor(private readonly getConfig: GetConfigUseCase) {}

  @Public()
  @Get()
  @Serialize(ConfigResponse)
  @ApiOperation({ summary: 'Parâmetros de negócio do agendamento' })
  get(): SchedulingConfig {
    return this.getConfig.execute();
  }
}
