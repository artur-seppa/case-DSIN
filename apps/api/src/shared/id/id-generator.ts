import { Injectable } from '@nestjs/common';
import { monotonicFactory } from 'ulidx';

export abstract class IdGenerator {
  abstract generate(): string;
}

@Injectable()
export class UlidIdGenerator extends IdGenerator {
  private readonly ulid = monotonicFactory();

  generate(): string {
    return this.ulid();
  }
}
