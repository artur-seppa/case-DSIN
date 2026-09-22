import { HttpStatus, UnprocessableEntityException } from '@nestjs/common';

export class ServicesNotFoundException extends UnprocessableEntityException {
  constructor(serviceIds: string[]) {
    super({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'SERVICES_NOT_FOUND',
      message: 'Alguns serviços informados não existem',
      serviceIds,
    });
  }
}

export class InvalidWorkingHoursException extends UnprocessableEntityException {
  constructor(message: string) {
    super({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'INVALID_WORKING_HOURS',
      message,
    });
  }
}
