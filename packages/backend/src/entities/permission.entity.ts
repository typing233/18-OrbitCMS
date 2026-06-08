import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Role } from './role.entity';

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  PUBLISH = 'publish',
  MANAGE = 'manage',
}

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  resource: string;

  @Column({ type: 'enum', enum: PermissionAction })
  action: PermissionAction;

  @Column({ type: 'jsonb', nullable: true })
  conditions: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  fieldRestrictions: { allowed?: string[]; denied?: string[] } | null;

  @ManyToMany(() => Role, (role) => role.permissions)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'permissionId' },
    inverseJoinColumn: { name: 'roleId' },
  })
  roles: Role[];

  @CreateDateColumn()
  createdAt: Date;
}
