import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray } from 'class-validator';
import { validationMessages } from '../../../../shared/validation/messages.js';
import { IsUlid } from '../../../../shared/validation/ulid.js';

export class SetServicesDto {
  @ApiProperty({
    type: [String],
    example: ['01M30K8EVJW30BGBPJX78A3GHM'],
    description:
      'Substitui os serviços do profissional. Lista vazia remove todos',
  })
  @IsArray(validationMessages.invalid('Serviços'))
  @ArrayUnique({ message: 'Serviços: não repita o mesmo item' })
  @ArrayMaxSize(100, { message: 'Serviços: informe no máximo 100 itens' })
  @IsUlid({ each: true })
  serviceIds: string[];
}
