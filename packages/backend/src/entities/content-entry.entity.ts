import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { ContentType } from './content-type.entity';

@Entity('content_entries')
@Index(['contentTypeId'])
export class ContentEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  contentTypeId: string;

  @ManyToOne(() => ContentType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentTypeId' })
  contentType: ContentType;

  @Column({ type: 'jsonb', default: {} })
  data: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
