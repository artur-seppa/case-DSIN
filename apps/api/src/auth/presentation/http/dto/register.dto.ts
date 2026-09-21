import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9()+\-\s]{8,30}$/, {
    message: 'phone must be a valid phone number',
  })
  phone?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
