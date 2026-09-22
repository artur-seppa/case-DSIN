import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { Service } from '../../services/domain/service.entity.js';
import { Professional } from './professional.entity.js';

@Entity({ name: 'professional_services' })
export class ProfessionalService {
  @PrimaryColumn({ name: 'professional_id', type: 'char', length: 26 })
  professionalId: string;

  @ManyToOne(() => Professional, (professional) => professional.services, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'professional_id' })
  professional?: Relation<Professional>;

  @PrimaryColumn({ name: 'service_id', type: 'char', length: 26 })
  serviceId: string;

  @Index()
  @ManyToOne(() => Service, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'service_id' })
  service?: Relation<Service>;
}
