import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { AuditService } from './audit.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(tenantId: string, page = 1, pageSize = 20) {
    const [data, total] = await this.userRepo.findAndCount({
      where: { tenantId },
      relations: ['roles'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOne(id: string, tenantId: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id, tenantId },
      relations: ['roles', 'roles.permissions'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateRoles(id: string, tenantId: string, roleIds: string[], actorId: string) {
    const user = await this.findOne(id, tenantId);
    const oldRoles = user.roles.map((r) => r.slug);

    const roles = await this.roleRepo.findByIds(roleIds);
    user.roles = roles.filter((r) => r.tenantId === tenantId);
    await this.userRepo.save(user);

    await this.auditService.log({
      tenantId,
      userId: actorId,
      action: 'user.roles.update',
      resource: 'user',
      resourceId: id,
      before: { roles: oldRoles },
      after: { roles: user.roles.map((r) => r.slug) },
    });

    return user;
  }

  async deactivate(id: string, tenantId: string, actorId: string) {
    const user = await this.findOne(id, tenantId);
    user.isActive = false;
    await this.userRepo.save(user);

    await this.auditService.log({
      tenantId,
      userId: actorId,
      action: 'user.deactivate',
      resource: 'user',
      resourceId: id,
    });

    return user;
  }

  async activate(id: string, tenantId: string, actorId: string) {
    const user = await this.findOne(id, tenantId);
    user.isActive = true;
    await this.userRepo.save(user);

    await this.auditService.log({
      tenantId,
      userId: actorId,
      action: 'user.activate',
      resource: 'user',
      resourceId: id,
    });

    return user;
  }
}
