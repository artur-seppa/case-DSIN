import { Body, Controller, Patch } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import { CurrentUser } from '../../../shared/auth/decorators.js';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UserResponse } from './dto/user.response.js';

@ApiTags('users')
@ApiCookieAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly updateProfile: UpdateProfileUseCase) {}

  @Patch('me')
  async updateMe(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: UpdateProfileDto,
  ): Promise<UserResponse> {
    const user = await this.updateProfile.execute({
      userId: actor.id,
      name: body.name,
      phone: body.phone,
    });
    return UserResponse.from(user);
  }
}
