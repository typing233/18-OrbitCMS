import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../entities/role.entity';
import { Permission, PermissionAction } from '../../entities/permission.entity';
import { AuditService } from './audit.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(tenantId: string) {
    return this.roleRepo.find({
      where: { tenantId },
      relations: ['permissions'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id, tenantId },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(
    tenantId: string,
    dto: { name: string; slug: string; description?: string; parentRoleId?: string },
    actorId: string,
  ) {
    const role = this.roleRepo.create({ ...dto, tenantId });
    const saved = await this.roleRepo.save(role);

    await this.auditService.log({
      tenantId,
      userId: actorId,
      action: 'role.create',
      resource: 'role',
      resourceId: saved.id,
      after: { name: saved.name, slug: saved.slug },
    });

    return saved;
  }

  async update(
    id: string,
    tenantId: string,
    dto: { name?: string; description?: string; parentRoleId?: string | null },
    actorId: string,
  ) {
    const role = await this.findOne(id, tenantId);
    if (role.isSystem) {
      throw new Error('Cannot modify system roles');
    }
    const before = { name: role.name, description: role.description };
    Object.assign(role, dto);
    const saved = await this.roleRepo.save(role);

    await this.auditService.log({
      tenantId,
      userId: actorId,
      action: 'role.update',
      resource: 'role',
      resourceId: id,
      before,
      after: { name: saved.name, description: saved.description },
    });

    return saved;
  }

  async delete(id: string, tenantId: string, actorId: string) {
    const role = await this.findOne(id, tenantId);
    if (role.isSystem) {
      throw new Error('Cannot delete system roles');
    }
    await this.roleRepo.remove(role);

    await this.auditService.log({
      tenantId,
      userId: actorId,
      action: 'role.delete',
      resource: 'role',
      resourceId: id,
      before: { name: role.name, slug: role.slug },
    });
  }

  async assignPermissions(
    roleId: string,
    tenantId: string,
    permissions: { resource: string; action: PermissionAction; conditions?: Record<string, any>; fieldRestrictions?: any }[],
    actorId: string,
  ) {
    const role = await this.findOne(roleId, tenantId);
    const oldPerms = role.permissions?.map((p) => `${p.resource}:${p.action}`);

    const permEntities: Permission[] = [];
    for (const p of permissions) {
      let perm = await this.permRepo.findOne({
        where: { resource: p.resource, action: p.action },
      });
      if (!perm) {
        perm = this.permRepo.create({
          resource: p.resource,
          action: p.action,
          conditions: p.conditions || null,
          fieldRestrictions: p.fieldRestrictions || null,
        });
        perm = await this.permRepo.save(perm);
      }
      permEntities.push(perm);
    }

    role.permissions = permEntities;
    await this.roleRepo.save(role);

    await this.auditService.log({
      tenantId,
      userId: actorId,
      action: 'role.permissions.update',
      resource: 'role',
      resourceId: roleId,
      before: { permissions: oldPerms },
      after: { permissions: permEntities.map((p) => `${p.resource}:${p.action}`) },
    });

    return role;
  }

  async getEffectivePermissions(roleId: string, tenantId: string): Promise<Permission[]> {
    const role = await this.findOne(roleId, tenantId);
    const perms = [...(role.permissions || [])];

    if (role.parentRoleId) {
      const parentPerms = await this.getEffectivePermissions(role.parentRoleId, tenantId);
      for (const pp of parentPerms) {
        if (!perms.find((p) => p.resource === pp.resource && p.action === pp.action)) {
          perms.push(pp);
        }
      }
    }

    return perms;
  }

  async seedDefaults(tenantId: string) {
    const defaults = [
      { name: 'Administrator', slug: 'admin', description: 'Full system access', isSystem: true },
      { name: 'Editor', slug: 'editor', description: 'Can create and edit content', isSystem: true },
      { name: 'Auditor', slug: 'auditor', description: 'Read-only access with audit log visibility', isSystem: true },
      { name: 'Viewer', slug: 'viewer', description: 'Read-only access', isSystem: true },
    ];

    for (const def of defaults) {
      const exists = await this.roleRepo.findOne({ where: { slug: def.slug, tenantId } });
      if (!exists) {
        await this.roleRepo.save(this.roleRepo.create({ ...def, tenantId }));
      }
    }
  }
}
