import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CsrfExceptionFilter } from './http/csrf-exception.filter.js';
import { Clock, SystemClock } from './time/clock.js';

@Global()
@Module({
  providers: [
    { provide: Clock, useClass: SystemClock },
    { provide: APP_FILTER, useClass: CsrfExceptionFilter },
  ],
  exports: [Clock],
})
export class SharedModule {}
