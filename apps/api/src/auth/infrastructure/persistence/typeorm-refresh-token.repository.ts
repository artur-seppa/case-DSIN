import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RefreshToken } from '../../domain/refresh-token.entity.js';
import { RefreshTokenRepository } from '../../domain/refresh-token.repository.js';

@Injectable()
export class TypeOrmRefreshTokenRepository extends RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repository: Repository<RefreshToken>,
  ) {
    super();
  }

  async insert(token: RefreshToken): Promise<void> {
    await this.repository.insert(token);
  }

  findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repository.findOneBy({ tokenHash });
  }

  async revokeIfActive(id: string, at: Date): Promise<boolean> {
    const result = await this.repository.update(
      { id, revokedAt: IsNull() },
      { revokedAt: at },
    );
    return (result.affected ?? 0) === 1;
  }

  async revokeFamily(familyId: string, at: Date): Promise<void> {
    await this.repository.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: at },
    );
  }
}
