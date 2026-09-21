import { HttpStatus, UnauthorizedException } from '@nestjs/common';

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super({
      statusCode: HttpStatus.UNAUTHORIZED,
      code: 'INVALID_CREDENTIALS',
      message: 'E-mail ou senha inválidos',
    });
  }
}

export class InvalidRefreshTokenException extends UnauthorizedException {
  constructor() {
    super({
      statusCode: HttpStatus.UNAUTHORIZED,
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Sessão inválida ou expirada. Entre novamente',
    });
  }
}
