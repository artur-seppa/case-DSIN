import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case.js';
import { FindUserByEmailUseCase } from './application/use-cases/find-user-by-email.use-case.js';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id.use-case.js';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case.js';
import { User } from './domain/user.entity.js';
import { UserRepository } from './domain/user.repository.js';
import { TypeOrmUserRepository } from './infrastructure/persistence/typeorm-user.repository.js';
import { UsersController } from './presentation/http/users.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [
    { provide: UserRepository, useClass: TypeOrmUserRepository },
    CreateUserUseCase,
    GetUserByIdUseCase,
    FindUserByEmailUseCase,
    UpdateProfileUseCase,
  ],
  exports: [CreateUserUseCase, GetUserByIdUseCase, FindUserByEmailUseCase],
})
export class UsersModule {}
