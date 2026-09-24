import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ItemStatus } from '../../domain/rules/item-status.js';

const ROUTE_VALUE_TO_STATUS: Record<string, ItemStatus> = {
  confirmed: ItemStatus.CONFIRMED,
  'in-progress': ItemStatus.IN_PROGRESS,
  completed: ItemStatus.COMPLETED,
  'no-show': ItemStatus.NO_SHOW,
};

@Injectable()
export class ParseItemStatusPipe implements PipeTransform<string, ItemStatus> {
  transform(value: string): ItemStatus {
    const status = ROUTE_VALUE_TO_STATUS[value];
    if (!status) {
      throw new BadRequestException('Status inválido');
    }
    return status;
  }
}
