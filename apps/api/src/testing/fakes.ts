import { IdGenerator } from '../shared/id/id-generator.js';
import { PasswordHasher } from '../shared/security/password-hasher.js';
import { Clock } from '../shared/time/clock.js';

export class FakeClock extends Clock {
  constructor(private current = new Date('2026-09-21T12:00:00.000Z')) {
    super();
  }

  now(): Date {
    return new Date(this.current);
  }

  set(date: Date): void {
    this.current = date;
  }

  advanceMinutes(minutes: number): void {
    this.current = new Date(this.current.getTime() + minutes * 60_000);
  }
}

export class SequentialIdGenerator extends IdGenerator {
  private counter = 0;

  generate(): string {
    this.counter += 1;
    return String(this.counter).padStart(26, '0');
  }
}

export class FakePasswordHasher extends PasswordHasher {
  hash(plain: string): Promise<string> {
    return Promise.resolve(`hashed:${plain}`);
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${plain}`);
  }
}
