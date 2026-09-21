import { EmailAlreadyInUseException } from '../users/domain/exceptions.js';
import { User } from '../users/domain/user.entity.js';
import { UserRepository } from '../users/domain/user.repository.js';

export class InMemoryUserRepository extends UserRepository {
  readonly items = new Map<string, User>();

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.copyOf(this.items.get(id)));
  }

  findByEmail(email: string): Promise<User | null> {
    const wanted = email.toLowerCase();
    const found = [...this.items.values()].find(
      (user) => user.email.toLowerCase() === wanted,
    );
    return Promise.resolve(this.copyOf(found));
  }

  insert(user: User): Promise<void> {
    const duplicated = [...this.items.values()].some(
      (existing) => existing.email.toLowerCase() === user.email.toLowerCase(),
    );
    if (duplicated) {
      return Promise.reject(new EmailAlreadyInUseException());
    }
    this.items.set(user.id, user);
    return Promise.resolve();
  }

  update(user: User): Promise<void> {
    this.items.set(user.id, this.copyOf(user)!);
    return Promise.resolve();
  }

  private copyOf(user: User | undefined): User | null {
    return user ? Object.assign(new User(), user) : null;
  }
}
