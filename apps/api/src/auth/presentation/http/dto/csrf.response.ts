import { Expose } from 'class-transformer';

export class CsrfResponse {
  @Expose()
  csrfToken: string;
}
