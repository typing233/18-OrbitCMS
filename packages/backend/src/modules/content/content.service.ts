import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentEntry } from '../../entities/content-entry.entity';
import { ContentType } from '../../entities/content-type.entity';
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
  ): Promise<PaginatedResponse<ContentEntry>> {
    const contentType = await this.resolveContentType(contentTypeSlug);
    const { page = 1, pageSize = 20, sort, order = 'DESC' } = pagination;

    const qb = this.entryRepo
      .createQueryBuilder('entry')
      .where('entry.contentTypeId = :ctId', { ctId: contentType.id });

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

  async findOne(contentTypeSlug: string, id: string): Promise<ContentEntry> {
    const contentType = await this.resolveContentType(contentTypeSlug);
    const entry = await this.entryRepo.findOne({
      where: { id, contentTypeId: contentType.id },
    });
    if (!entry) {
      throw new NotFoundException(`Entry "${id}" not found`);
    }
    return entry;
  }

  async create(
    contentTypeSlug: string,
    data: Record<string, any>,
  ): Promise<ContentEntry> {
    const contentType = await this.resolveContentType(contentTypeSlug);

    await this.validator.validate(contentType.fields, data, contentType.id);

    const entry = this.entryRepo.create({
      contentTypeId: contentType.id,
      data,
    });

    return this.entryRepo.save(entry);
  }

  async update(
    contentTypeSlug: string,
    id: string,
    data: Record<string, any>,
  ): Promise<ContentEntry> {
    const contentType = await this.resolveContentType(contentTypeSlug);
    const entry = await this.findOne(contentTypeSlug, id);

    await this.validator.validate(contentType.fields, data, contentType.id, id);

    entry.data = data;
    return this.entryRepo.save(entry);
  }

  async remove(contentTypeSlug: string, id: string): Promise<void> {
    const entry = await this.findOne(contentTypeSlug, id);
    await this.entryRepo.remove(entry);
  }
}
