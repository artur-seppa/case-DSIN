import { Body, Controller, Patch } from '@nestjs/common';
import { ApiCookieAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import { CurrentUser } from '../../../shared/auth/decorators.js';
import { Serialize } from '../../../shared/http/serialize.js';
import type { User } from '../../domain/user.entity.js';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UserResponse } from './dto/user.response.js';

@ApiTags('users')
@ApiCookieAuth()
@ApiSecurity('csrf')
@Controller('users')
export class UsersController {
  constructor(private readonly updateProfile: UpdateProfileUseCase) {}

  @Patch('me')
  @Serialize(UserResponse)
  async updateMe(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: UpdateProfileDto,
  ): Promise<User> {
    return this.updateProfile.execute(actor.id, body);
  }
}
