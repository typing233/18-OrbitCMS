import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentEntry, EntryStatus } from '../../entities/content-entry.entity';
import { ContentType } from '../../entities/content-type.entity';
import { ContentVersion, ContentStatus } from '../../entities/content-version.entity';
import { ContentValidatorService } from './validation/content-validator.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(ContentEntry)
    private readonly entryRepo: Repository<ContentEntry>,
    @InjectRepository(ContentType)
    private readonly contentTypeRepo: Repository<ContentType>,
    @InjectRepository(ContentVersion)
    private readonly versionRepo: Repository<ContentVersion>,
    private readonly validator: ContentValidatorService,
  ) {}

  private async resolveContentType(slug: string): Promise<ContentType> {
    const contentType = await this.contentTypeRepo.findOne({
      where: { slug },
      relations: ['fields'],
    });
    if (!contentType) {
      throw new NotFoundException(`Content type "${slug}" not found`);
    }
    return contentType;
  }

  async findAll(
    contentTypeSlug: string,
    pagination: PaginationDto,
    tenantId?: string,
  ): Promise<PaginatedResponse<ContentEntry>> {
    const contentType = await this.resolveContentType(contentTypeSlug);
    const { page = 1, pageSize = 20, sort, order = 'DESC' } = pagination;

    const qb = this.entryRepo
      .createQueryBuilder('entry')
      .where('entry.contentTypeId = :ctId', { ctId: contentType.id });

    if (tenantId) {
      qb.andWhere('entry.tenantId = :tenantId', { tenantId });
    }

    if (sort) {
      qb.orderBy(`entry.data ->> '${sort}'`, order);
    } else {
      qb.orderBy('entry.createdAt', order);
    }

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(contentTypeSlug: string, id: string, tenantId?: string): Promise<ContentEntry> {
    const contentType = await this.resolveContentType(contentTypeSlug);
    const where: any = { id, contentTypeId: contentType.id };
    if (tenantId) where.tenantId = tenantId;

    const entry = await this.entryRepo.findOne({ where });
    if (!entry) {
      throw new NotFoundException(`Entry "${id}" not found`);
    }
    return entry;
  }

  async create(
    contentTypeSlug: string,
    data: Record<string, any>,
    options?: { tenantId?: string; userId?: string },
  ): Promise<ContentEntry> {
    const contentType = await this.resolveContentType(contentTypeSlug);

    await this.validator.validate(contentType.fields, data, contentType.id);

    const entry = this.entryRepo.create({
      contentTypeId: contentType.id,
      tenantId: options?.tenantId || undefined,
      data,
      status: EntryStatus.DRAFT,
      currentVersion: 1,
      createdById: options?.userId || undefined,
      updatedById: options?.userId || undefined,
    } as any);

    const saved = await this.entryRepo.save(entry) as unknown as ContentEntry;

    await this.versionRepo.save(
      this.versionRepo.create({
        entryId: saved.id,
        version: 1,
        data,
        status: ContentStatus.DRAFT,
        createdById: options?.userId || null,
        changeNote: 'Initial creation',
      }),
    );

    return saved;
  }

  async update(
    contentTypeSlug: string,
    id: string,
    data: Record<string, any>,
    options?: { tenantId?: string; userId?: string; expectedVersion?: number },
  ): Promise<ContentEntry> {
    const contentType = await this.resolveContentType(contentTypeSlug);
    const entry = await this.findOne(contentTypeSlug, id, options?.tenantId);

    if (options?.expectedVersion && entry.lockVersion !== options.expectedVersion) {
      throw new ConflictException({
        message: 'Conflict: entry has been modified by another user',
        currentVersion: entry.lockVersion,
        expectedVersion: options.expectedVersion,
        currentData: entry.data,
      });
    }

    if (entry.lockedById && entry.lockedById !== options?.userId) {
      const lockAge = Date.now() - (entry.lockedAt?.getTime() || 0);
      if (lockAge < 5 * 60 * 1000) {
        throw new ConflictException({
          message: 'Entry is locked by another user',
          lockedBy: entry.lockedById,
          lockedAt: entry.lockedAt,
        });
      }
    }

    await this.validator.validate(contentType.fields, data, contentType.id, id);

    entry.data = data;
    entry.currentVersion += 1;
    entry.updatedById = options?.userId || null;

    const saved = await this.entryRepo.save(entry);

    await this.versionRepo.save(
      this.versionRepo.create({
        entryId: saved.id,
        version: saved.currentVersion,
        data,
        status: saved.status === EntryStatus.PUBLISHED ? ContentStatus.DRAFT : ContentStatus.DRAFT,
        createdById: options?.userId || null,
      }),
    );

    return saved;
  }

  async publish(contentTypeSlug: string, id: string, options?: { tenantId?: string; userId?: string }): Promise<ContentEntry> {
    const entry = await this.findOne(contentTypeSlug, id, options?.tenantId);
    entry.status = EntryStatus.PUBLISHED;
    entry.publishedData = { ...entry.data };
    entry.updatedById = options?.userId || null;
    const saved = await this.entryRepo.save(entry);

    const latestVersion = await this.versionRepo.findOne({
      where: { entryId: id, version: entry.currentVersion },
    });
    if (latestVersion) {
      latestVersion.status = ContentStatus.PUBLISHED;
      await this.versionRepo.save(latestVersion);
    }

    return saved;
  }

  async unpublish(contentTypeSlug: string, id: string, options?: { tenantId?: string; userId?: string }): Promise<ContentEntry> {
    const entry = await this.findOne(contentTypeSlug, id, options?.tenantId);
    entry.status = EntryStatus.DRAFT;
    entry.publishedData = null;
    entry.updatedById = options?.userId || null;
    return this.entryRepo.save(entry);
  }

  async rollback(contentTypeSlug: string, id: string, targetVersion: number, options?: { tenantId?: string; userId?: string }): Promise<ContentEntry> {
    const entry = await this.findOne(contentTypeSlug, id, options?.tenantId);
    const version = await this.versionRepo.findOne({
      where: { entryId: id, version: targetVersion },
    });
    if (!version) {
      throw new NotFoundException(`Version ${targetVersion} not found`);
    }

    entry.data = version.data;
    entry.currentVersion += 1;
    entry.updatedById = options?.userId || null;

    const saved = await this.entryRepo.save(entry);

    await this.versionRepo.save(
      this.versionRepo.create({
        entryId: saved.id,
        version: saved.currentVersion,
        data: version.data,
        status: ContentStatus.DRAFT,
        createdById: options?.userId || null,
        changeNote: `Rolled back to version ${targetVersion}`,
      }),
    );

    return saved;
  }

  async getVersions(contentTypeSlug: string, id: string, tenantId?: string) {
    await this.findOne(contentTypeSlug, id, tenantId);
    return this.versionRepo.find({
      where: { entryId: id },
      order: { version: 'DESC' },
    });
  }

  async lock(contentTypeSlug: string, id: string, userId: string, tenantId?: string): Promise<ContentEntry> {
    const entry = await this.findOne(contentTypeSlug, id, tenantId);
    if (entry.lockedById && entry.lockedById !== userId) {
      const lockAge = Date.now() - (entry.lockedAt?.getTime() || 0);
      if (lockAge < 5 * 60 * 1000) {
        throw new ConflictException('Entry is already locked');
      }
    }
    entry.lockedById = userId;
    entry.lockedAt = new Date();
    return this.entryRepo.save(entry);
  }

  async unlock(contentTypeSlug: string, id: string, userId: string, tenantId?: string): Promise<ContentEntry> {
    const entry = await this.findOne(contentTypeSlug, id, tenantId);
    if (entry.lockedById === userId || !entry.lockedById) {
      entry.lockedById = null;
      entry.lockedAt = null;
    }
    return this.entryRepo.save(entry);
  }

  async remove(contentTypeSlug: string, id: string, tenantId?: string): Promise<void> {
    const entry = await this.findOne(contentTypeSlug, id, tenantId);
    await this.entryRepo.remove(entry);
  }

  async getOptions(
    contentTypeSlug: string,
    search?: string,
  ): Promise<{ id: string; label: string }[]> {
    const contentType = await this.resolveContentType(contentTypeSlug);

    const firstTextField = contentType.fields
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .find((f) => f.fieldType === 'text');

    const displayField = firstTextField?.slug || null;

    const qb = this.entryRepo
      .createQueryBuilder('entry')
      .where('entry.contentTypeId = :ctId', { ctId: contentType.id });

    if (search && displayField) {
      qb.andWhere(`entry.data ->> :field ILIKE :search`, {
        field: displayField,
        search: `%${search}%`,
      });
    }

    qb.orderBy('entry.createdAt', 'DESC').take(50);

    const entries = await qb.getMany();

    return entries.map((entry) => ({
      id: entry.id,
      label: displayField
        ? String(entry.data[displayField] || entry.id)
        : entry.id,
    }));
  }
}
