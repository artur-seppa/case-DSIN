import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Role } from '../../shared/auth/role.js';

@Entity({ name: 'users' })
export class User {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'citext' })
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, enumName: 'user_role' })
  role: Role;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  updateProfile(
    changes: { name?: string; phone?: string | null },
    now: Date,
  ): void {
    if (changes.name !== undefined) {
      this.name = changes.name;
    }
    if (changes.phone !== undefined) {
      this.phone = changes.phone;
    }
    this.updatedAt = now;
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
