import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentType } from '../../entities/content-type.entity';
import { FieldDefinition } from '../../entities/field-definition.entity';
import { CreateContentTypeDto, UpdateContentTypeDto } from './dto';
import { slugify } from '../../common/utils/slugify';

@Injectable()
export class ContentTypeService {
  constructor(
    @InjectRepository(ContentType)
    private readonly contentTypeRepo: Repository<ContentType>,
    @InjectRepository(FieldDefinition)
    private readonly fieldDefRepo: Repository<FieldDefinition>,
  ) {}

  async findAll(): Promise<ContentType[]> {
    return this.contentTypeRepo.find({
      relations: ['fields'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(idOrSlug: string): Promise<ContentType> {
    const contentType = await this.contentTypeRepo.findOne({
      where: [{ id: idOrSlug }, { slug: idOrSlug }],
      relations: ['fields'],
    });

    if (!contentType) {
      throw new NotFoundException(`Content type "${idOrSlug}" not found`);
    }

    contentType.fields.sort((a, b) => a.sortOrder - b.sortOrder);
    return contentType;
  }

  async create(dto: CreateContentTypeDto): Promise<ContentType> {
    const slug = slugify(dto.name);

    const existing = await this.contentTypeRepo.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Content type with slug "${slug}" already exists`);
    }

    const contentType = this.contentTypeRepo.create({
      name: dto.name,
      slug,
      description: dto.description || null,
    });

    const saved = await this.contentTypeRepo.save(contentType);

    if (dto.fields?.length) {
      const fields = dto.fields.map((f, index) =>
        this.fieldDefRepo.create({
          contentTypeId: saved.id,
          name: f.name,
          slug: f.slug || slugify(f.name),
          fieldType: f.fieldType,
          validations: f.validations || {},
          relationConfig: f.relationConfig || null,
          sortOrder: f.sortOrder ?? index,
        }),
      );
      await this.fieldDefRepo.save(fields);
    }

    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateContentTypeDto): Promise<ContentType> {
    const contentType = await this.findOne(id);

    if (dto.name && dto.name !== contentType.name) {
      const newSlug = slugify(dto.name);
      const conflict = await this.contentTypeRepo.findOne({
        where: { slug: newSlug },
      });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Content type with slug "${newSlug}" already exists`);
      }
      contentType.name = dto.name;
      contentType.slug = newSlug;
    }

    if (dto.description !== undefined) {
      contentType.description = dto.description || null;
    }

    await this.contentTypeRepo.save(contentType);

    if (dto.fields !== undefined) {
      await this.fieldDefRepo.delete({ contentTypeId: id });

      if (dto.fields.length) {
        const fields = dto.fields.map((f, index) =>
          this.fieldDefRepo.create({
            contentTypeId: id,
            name: f.name,
            slug: f.slug || slugify(f.name),
            fieldType: f.fieldType,
            validations: f.validations || {},
            relationConfig: f.relationConfig || null,
            sortOrder: f.sortOrder ?? index,
          }),
        );
        await this.fieldDefRepo.save(fields);
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const contentType = await this.findOne(id);
    await this.contentTypeRepo.remove(contentType);
  }
}
