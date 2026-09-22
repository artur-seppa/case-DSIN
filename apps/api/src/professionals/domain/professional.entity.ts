import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { generateId } from '../../shared/id/generate-id.js';
import { ProfessionalService } from './professional-service.entity.js';
import { WorkingHours } from './working-hours.entity.js';

@Entity({ name: 'professionals' })
export class Professional {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string = generateId();

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => ProfessionalService, (link) => link.professional)
  services?: ProfessionalService[];

  @OneToMany(() => WorkingHours, (hours) => hours.professional)
  workingHours?: WorkingHours[];
}
