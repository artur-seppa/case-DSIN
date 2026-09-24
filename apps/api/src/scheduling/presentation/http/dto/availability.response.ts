import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

class SameWeekSuggestionResponse {
  @Expose() date: string;

  @Expose()
  @ApiProperty({ type: [Date] })
  starts: Date[];
}

export class AvailabilityResponse {
  @Expose() date: string;

  @Expose()
  @ApiProperty({ type: [Date] })
  starts: Date[];

  @Expose()
  @Type(() => SameWeekSuggestionResponse)
  @ApiPropertyOptional({ type: SameWeekSuggestionResponse, nullable: true })
  sameWeekSuggestion: SameWeekSuggestionResponse | null;
}
