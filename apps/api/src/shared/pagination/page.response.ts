import type { Type as ClassType } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export function PageResponse<T>(item: ClassType<T>) {
  class PageResponseClass {
    @Expose()
    @Type(() => item)
    @ApiProperty({ type: [item] })
    items: T[];

    @Expose()
    @ApiProperty({
      example: 42,
      description: 'Total de itens em todas as páginas',
    })
    total: number;

    @Expose()
    @ApiProperty({ example: 1 })
    page: number;

    @Expose()
    @ApiProperty({ example: 20 })
    limit: number;

    @Expose()
    @ApiProperty({ example: 3 })
    totalPages: number;
  }
  return PageResponseClass;
}
