import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../shared/auth/decorators.js';
import { Role } from '../../../shared/auth/role.js';
import { Serialize } from '../../../shared/http/serialize.js';
import { GetWeeklyReportUseCase } from '../../application/use-cases/get-weekly-report.use-case.js';
import { WeeklyReportQuery } from './dto/weekly-report.query.js';
import { WeeklyReportResponse } from './dto/weekly-report.response.js';

@ApiTags('reports')
@ApiCookieAuth()
@ApiSecurity('csrf')
@Controller('reports')
export class ReportsController {
  constructor(private readonly getWeeklyReport: GetWeeklyReportUseCase) {}

  @Roles([Role.ADMIN])
  @Get('weekly')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60_000)
  @Serialize(WeeklyReportResponse)
  @ApiOperation({ summary: 'Painel gerencial semanal, com comparação com a semana anterior' })
  weekly(@Query() query: WeeklyReportQuery) {
    return this.getWeeklyReport.execute(query.weekStart);
  }
}
