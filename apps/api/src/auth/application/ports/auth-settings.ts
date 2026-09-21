export abstract class AuthSettings {
  abstract readonly accessTokenTtlMinutes: number;
  abstract readonly refreshTokenTtlDays: number;
}
