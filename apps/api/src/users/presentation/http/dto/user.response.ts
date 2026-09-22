import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Role } from '../../../../shared/auth/role.js';

export class UserResponse {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() email: string;
  @Expose()
  @ApiProperty({ type: String, example: '+5511912345678', nullable: true })
  phone: string | null;
  @Expose() role: Role;
  @Expose() createdAt: Date;
}
