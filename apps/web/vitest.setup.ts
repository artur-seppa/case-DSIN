import '@testing-library/jest-dom/vitest';

const OriginalRequest = globalThis.Request;

globalThis.Request = class extends OriginalRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string' && input.startsWith('/')) {
      super(new URL(input, 'http://localhost'), init);
    } else {
      super(input as RequestInfo, init);
    }
  }
} as typeof Request;
