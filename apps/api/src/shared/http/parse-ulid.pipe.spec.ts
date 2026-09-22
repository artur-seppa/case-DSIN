import { BadRequestException } from '@nestjs/common';
import { ParseUlidPipe } from './parse-ulid.pipe.js';

describe('ParseUlidPipe', () => {
  const pipe = new ParseUlidPipe();

  it('returns a valid ulid unchanged', () => {
    expect(pipe.transform('01M30K8EVJW30BGBPJX78A3GHM')).toBe(
      '01M30K8EVJW30BGBPJX78A3GHM',
    );
  });

  it.each(['', 'abc', '01m30k8evjw30bgbpjx78a3ghm', '123'])(
    'rejects %j as a bad request in Portuguese',
    (value) => {
      expect(() => pipe.transform(value)).toThrow(BadRequestException);
      expect(() => pipe.transform(value)).toThrow('Identificador inválido');
    },
  );
});
