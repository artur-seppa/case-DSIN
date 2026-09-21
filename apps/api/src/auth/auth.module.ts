import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { EnvironmentVariables } from '../shared/config/env.validation.js';
import { UsersModule } from '../users/users.module.js';
import { AccessTokenService } from './application/ports/access-token.service.js';
import { AuthSettings } from './application/ports/auth-settings.js';
import { RefreshTokenCodec } from './application/ports/refresh-token.codec.js';
import { LoginUseCase } from './application/use-cases/login.use-case.js';
import { LogoutUseCase } from './application/use-cases/logout.use-case.js';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case.js';
import { RegisterUseCase } from './application/use-cases/register.use-case.js';
import { SessionIssuer } from './application/use-cases/session-issuer.js';
import { RefreshToken } from './domain/refresh-token.entity.js';
import { RefreshTokenRepository } from './domain/refresh-token.repository.js';
import { ConfigAuthSettings } from './infrastructure/config/config-auth-settings.js';
import { TypeOrmRefreshTokenRepository } from './infrastructure/persistence/typeorm-refresh-token.repository.js';
import { JwtAccessTokenService } from './infrastructure/security/jwt-access-token.service.js';
import { Sha256RefreshTokenCodec } from './infrastructure/security/sha256-refresh-token.codec.js';
import { AuthController } from './presentation/http/auth.controller.js';
import { SessionCookies } from './presentation/http/cookies.js';
import { AccessTokenGuard } from './presentation/http/guards/access-token.guard.js';
import { RolesGuard } from './presentation/http/guards/roles.guard.js';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([RefreshToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: RefreshTokenRepository,
      useClass: TypeOrmRefreshTokenRepository,
    },
    { provide: AccessTokenService, useClass: JwtAccessTokenService },
    { provide: RefreshTokenCodec, useClass: Sha256RefreshTokenCodec },
    { provide: AuthSettings, useClass: ConfigAuthSettings },
    SessionIssuer,
    SessionCookies,
    RegisterUseCase,
    LoginUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
