import { Transform } from 'class-transformer';

export const BooleanQuery = () =>
  Transform(({ value }: { value: unknown }) => {
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    return value;
  });
