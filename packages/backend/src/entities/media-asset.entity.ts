import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

export enum MediaStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error',
}

@Entity('media_assets')
@Index(['tenantId'])
@Index(['contentHash'], { unique: true, where: '"contentHash" IS NOT NULL' })
export class MediaAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  filename: string;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column()
  storagePath: string;

  @Column({ nullable: true })
  contentHash: string | null;

  @Column({ nullable: true })
  thumbnailPath: string | null;

  @Column({ type: 'enum', enum: MediaStatus, default: MediaStatus.UPLOADING })
  status: MediaStatus;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  variants: { name: string; path: string; mimeType: string; size: number }[];

  @Column({ nullable: true })
  uploadedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User | null;

  @Column({ type: 'int', default: 0 })
  referenceCount: number;

  @Column({ type: 'jsonb', default: [] })
  references: { contentTypeId: string; entryId: string; fieldSlug: string }[];

  @Column({ type: 'int', default: 0 })
  chunksReceived: number;

  @Column({ type: 'int', default: 0 })
  totalChunks: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
