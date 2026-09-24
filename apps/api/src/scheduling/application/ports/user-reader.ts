export interface ClientSnapshot {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export abstract class UserReader {
  abstract findClient(id: string): Promise<ClientSnapshot | null>;
  abstract searchClientIds(query: string): Promise<string[]>;
}
