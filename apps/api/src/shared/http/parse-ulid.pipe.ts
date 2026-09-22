import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ULID_PATTERN } from '../validation/ulid.js';

@Injectable()
export class ParseUlidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!ULID_PATTERN.test(value)) {
      throw new BadRequestException('Identificador inválido');
    }
    return value;
  }
}
