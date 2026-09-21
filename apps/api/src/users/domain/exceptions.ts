import {
  ConflictException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';

export class EmailAlreadyInUseException extends ConflictException {
  constructor() {
    super({
      statusCode: HttpStatus.CONFLICT,
      code: 'EMAIL_ALREADY_IN_USE',
      message: 'Este e-mail já está cadastrado',
    });
  }
}

export class UserNotFoundException extends NotFoundException {
  constructor() {
    super({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'USER_NOT_FOUND',
      message: 'Usuário não encontrado',
    });
  }
}
