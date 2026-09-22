import { ConflictException, HttpStatus } from '@nestjs/common';

export class ServiceNameAlreadyInUseException extends ConflictException {
  constructor() {
    super({
      statusCode: HttpStatus.CONFLICT,
      code: 'SERVICE_NAME_ALREADY_IN_USE',
      message: 'Já existe um serviço com este nome',
    });
  }
}
