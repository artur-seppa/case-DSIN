import { Global, Module } from '@nestjs/common';
import { IdGenerator, UlidIdGenerator } from './id/id-generator.js';
import {
  Argon2PasswordHasher,
  PasswordHasher,
} from './security/password-hasher.js';
import { Clock, SystemClock } from './time/clock.js';

@Global()
@Module({
  providers: [
    { provide: IdGenerator, useClass: UlidIdGenerator },
    { provide: Clock, useClass: SystemClock },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
  ],
  exports: [IdGenerator, Clock, PasswordHasher],
})
export class SharedModule {}
