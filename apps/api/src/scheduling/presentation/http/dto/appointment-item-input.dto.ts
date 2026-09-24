import { ApiProperty } from '@nestjs/swagger';
import { IsUlid } from '../../../../shared/validation/ulid.js';

export class AppointmentItemInputDto {
  @ApiProperty({ example: '01M30K8EVJW30BGBPJX78A3GHM' })
  @IsUlid()
  serviceId: string;

  @ApiProperty({ example: '01M30K8EVJW30BGBPJX78A3GHM' })
  @IsUlid()
  professionalId: string;
}
