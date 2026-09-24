import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../../users/domain/user.repository.js';
import { UserReader, type ClientSnapshot } from '../../application/ports/user-reader.js';

@Injectable()
export class UserReaderAdapter extends UserReader {
  constructor(private readonly users: UserRepository) {
    super();
  }

  async findClient(id: string): Promise<ClientSnapshot | null> {
    const user = await this.users.findById(id);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone
    };
  }

  searchClientIds(query: string): Promise<string[]> {
    return this.users.searchClientIds(query);
  }
}
