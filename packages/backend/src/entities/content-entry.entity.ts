import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
  VersionColumn,
} from 'typeorm';
import { ContentType } from './content-type.entity';

export enum EntryStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('content_entries')
@Index(['contentTypeId'])
@Index(['tenantId'])
export class ContentEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  contentTypeId: string;

  @ManyToOne(() => ContentType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentTypeId' })
  contentType: ContentType;

  @Column({ nullable: true })
  tenantId: string;

  @Column({ type: 'jsonb', default: {} })
  data: Record<string, any>;

  @Column({ type: 'enum', enum: EntryStatus, default: EntryStatus.DRAFT })
  status: EntryStatus;

  @Column({ type: 'jsonb', nullable: true })
  publishedData: Record<string, any> | null;

  @Column({ type: 'int', default: 1 })
  currentVersion: number;

  @VersionColumn()
  lockVersion: number;

  @Column({ nullable: true })
  lockedById: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lockedAt: Date | null;

  @Column({ nullable: true })
  createdById: string | null;

  @Column({ nullable: true })
  updatedById: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
