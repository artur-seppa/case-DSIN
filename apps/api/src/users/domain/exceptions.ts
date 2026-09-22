import { ConflictException, HttpStatus } from '@nestjs/common';

export class EmailAlreadyInUseException extends ConflictException {
  constructor() {
    super({
      statusCode: HttpStatus.CONFLICT,
      code: 'EMAIL_ALREADY_IN_USE',
      message: 'Este e-mail já está cadastrado',
    });
  }
}
