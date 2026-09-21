import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { RefreshTokenCodec } from '../../application/ports/refresh-token.codec.js';

@Injectable()
export class Sha256RefreshTokenCodec extends RefreshTokenCodec {
  generate(): { token: string; hash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
