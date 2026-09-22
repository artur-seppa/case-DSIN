import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../shared/auth/role.js';
import { generateId } from '../../shared/id/generate-id.js';
import {
  hashPassword,
  verifyPassword,
} from '../../shared/security/password.js';

@Entity({ name: 'users' })
export class User {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string = generateId();

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'citext', unique: true })
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: Role,
    enumName: 'user_role',
    default: Role.CLIENT,
  })
  role: Role;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  async setPassword(plain: string): Promise<void> {
    this.passwordHash = await hashPassword(plain);
  }

  verifyPassword(plain: string): Promise<boolean> {
    return verifyPassword(this.passwordHash, plain);
  }
}

export type UserProps = Pick<
  User,
  | 'id'
  | 'name'
  | 'email'
  | 'phone'
  | 'passwordHash'
  | 'role'
  | 'createdAt'
  | 'updatedAt'
>;
