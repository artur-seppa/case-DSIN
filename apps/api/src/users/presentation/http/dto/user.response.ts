import { Expose, plainToInstance } from 'class-transformer';
import { Role } from '../../../../shared/auth/role.js';
import type { User } from '../../../domain/user.entity.js';

export class UserResponse {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() email: string;
  @Expose() phone: string | null;
  @Expose() role: Role;
  @Expose() createdAt: Date;

  static from(user: User): UserResponse {
    return plainToInstance(UserResponse, user, {
      excludeExtraneousValues: true,
    });
  }
}
