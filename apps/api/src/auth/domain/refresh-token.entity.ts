import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { generateId } from '../../shared/id/generate-id.js';
import { User } from '../../users/domain/user.entity.js';

@Entity({ name: 'refresh_tokens' })
export class RefreshToken {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string = generateId();

  @Index()
  @Column({ name: 'user_id', type: 'char', length: 26 })
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;

  @Index()
  @Column({ name: 'family_id', type: 'char', length: 26 })
  familyId: string = generateId();

  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  isExpired(now: Date): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }
}
