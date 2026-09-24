import type { User } from './user.entity.js';

export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract insert(user: User): Promise<void>;
  abstract update(
    id: string,
    changes: Partial<Pick<User, 'name' | 'phone'>>,
  ): Promise<User | null>;
  abstract searchClientIds(query: string): Promise<string[]>;
}
