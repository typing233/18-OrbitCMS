import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ContentEntry } from './content-entry.entity';
import { User } from './user.entity';

export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('content_versions')
@Index(['entryId', 'version'])
export class ContentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entryId: string;

  @ManyToOne(() => ContentEntry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entryId' })
  entry: ContentEntry;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @Column({ type: 'enum', enum: ContentStatus, default: ContentStatus.DRAFT })
  status: ContentStatus;

  @Column({ nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User | null;

  @Column({ type: 'text', nullable: true })
  changeNote: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
