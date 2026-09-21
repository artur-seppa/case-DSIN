import type { FastifyRequest } from 'fastify';
import type { Role } from './role.js';

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

export type AuthenticatedRequest = FastifyRequest & {
  user?: AuthenticatedUser;
};
