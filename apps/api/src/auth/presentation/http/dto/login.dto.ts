import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { validationMessages } from '../../../../shared/validation/messages.js';

export class LoginDto {
  @IsEmail({}, validationMessages.invalid('E-mail'))
  @MaxLength(254, validationMessages.maxLength('E-mail'))
  email: string;

  @IsString(validationMessages.invalid('Senha'))
  @IsNotEmpty(validationMessages.required('Senha'))
  @MaxLength(128, validationMessages.maxLength('Senha'))
  password: string;
}
