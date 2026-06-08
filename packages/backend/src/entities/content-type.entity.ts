import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FieldDefinition } from './field-definition.entity';
import { Tenant } from './tenant.entity';

@Entity('content_types')
@Index(['tenantId', 'slug'], { unique: true })
export class ContentType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => FieldDefinition, (field) => field.contentType, {
    cascade: true,
    eager: true,
  })
  fields: FieldDefinition[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
