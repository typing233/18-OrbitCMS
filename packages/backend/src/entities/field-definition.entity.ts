import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ContentType } from './content-type.entity';
import { FieldType } from '../common/enums/field-type.enum';
import { FieldValidations } from '../common/interfaces/field-validations.interface';
import { RelationConfig } from '../common/interfaces/relation-config.interface';

@Entity('field_definitions')
export class FieldDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  contentTypeId: string;

  @ManyToOne(() => ContentType, (ct) => ct.fields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentTypeId' })
  contentType: ContentType;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({ type: 'enum', enum: FieldType })
  fieldType: FieldType;

  @Column({ type: 'jsonb', default: {} })
  validations: FieldValidations;

  @Column({ type: 'jsonb', nullable: true })
  relationConfig: RelationConfig | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
