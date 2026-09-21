import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import '@fastify/csrf-protection';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import { CurrentUser, Public } from '../../../shared/auth/decorators.js';
import { LoginUseCase } from '../../application/use-cases/login.use-case.js';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case.js';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session.use-case.js';
import { RegisterUseCase } from '../../application/use-cases/register.use-case.js';
import { InvalidRefreshTokenException } from '../../domain/exceptions.js';
import { GetUserByIdUseCase } from '../../../users/application/use-cases/get-user-by-id.use-case.js';
import { UserResponse } from '../../../users/presentation/http/dto/user.response.js';
import { CsrfResponse } from './dto/csrf.response.js';
import { REFRESH_COOKIE, SessionCookies } from './cookies.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const CREDENTIALS_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly register: RegisterUseCase,
    private readonly login: LoginUseCase,
    private readonly refresh: RefreshSessionUseCase,
    private readonly logout: LogoutUseCase,
    private readonly getUser: GetUserByIdUseCase,
    private readonly cookies: SessionCookies,
  ) {}

  @Public()
  @Get('csrf')
  @ApiOperation({ summary: 'Gera o token CSRF (e o cookie que o acompanha)' })
  csrf(@Res({ passthrough: true }) reply: FastifyReply): CsrfResponse {
    return Object.assign(new CsrfResponse(), {
      csrfToken: reply.generateCsrf(),
    });
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle(CREDENTIALS_LIMIT)
  @Post('register')
  @ApiOperation({ summary: 'Cadastra um cliente e já abre a sessão' })
  async signUp(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<UserResponse> {
    const session = await this.register.execute(body);
    this.cookies.set(reply, session);
    return UserResponse.from(session.user);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle(CREDENTIALS_LIMIT)
  @HttpCode(200)
  @Post('login')
  @ApiOperation({ summary: 'Abre a sessão (cookies HttpOnly)' })
  async signIn(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<UserResponse> {
    const session = await this.login.execute(body);
    this.cookies.set(reply, session);
    return UserResponse.from(session.user);
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  @ApiOperation({ summary: 'Troca o refresh token por um par novo (rotação)' })
  async renew(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<UserResponse> {
    const rawToken = request.cookies[REFRESH_COOKIE];
    if (!rawToken) {
      throw new InvalidRefreshTokenException();
    }

    try {
      const session = await this.refresh.execute(rawToken);
      this.cookies.set(reply, session);
      return UserResponse.from(session.user);
    } catch (error) {
      this.cookies.clear(reply);
      throw error;
    }
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  @ApiOperation({ summary: 'Encerra a sessão e revoga o refresh token' })
  async signOut(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    await this.logout.execute(request.cookies[REFRESH_COOKIE]);
    this.cookies.clear(reply);
  }

  @ApiCookieAuth()
  @Get('me')
  @ApiOperation({ summary: 'Usuário da sessão atual' })
  async me(@CurrentUser() actor: AuthenticatedUser): Promise<UserResponse> {
    return UserResponse.from(await this.getUser.execute(actor.id));
  }
}
