import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../entities/audit-log.entity';

export interface AuditLogInput {
  tenantId: string;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(input: AuditLogInput): Promise<AuditLog> {
    const entry = this.auditRepo.create({
      tenantId: input.tenantId,
      userId: input.userId || null,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId || null,
      before: input.before || null,
      after: input.after || null,
      metadata: input.metadata || null,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
    });
    return this.auditRepo.save(entry);
  }

  async findByTenant(
    tenantId: string,
    options: { page?: number; pageSize?: number; resource?: string; action?: string; userId?: string },
  ) {
    const { page = 1, pageSize = 50, resource, action, userId } = options;
    const qb = this.auditRepo
      .createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId })
      .orderBy('log.createdAt', 'DESC');

    if (resource) qb.andWhere('log.resource = :resource', { resource });
    if (action) qb.andWhere('log.action = :action', { action });
    if (userId) qb.andWhere('log.userId = :userId', { userId });

    const total = await qb.getCount();
    const data = await qb.skip((page - 1) * pageSize).take(pageSize).getMany();

    return {
      data,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }
}
