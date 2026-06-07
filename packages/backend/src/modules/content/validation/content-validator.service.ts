import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FieldDefinition } from '../../../entities/field-definition.entity';
import { ContentEntry } from '../../../entities/content-entry.entity';
import { FieldType } from '../../../common/enums/field-type.enum';
import {
  FieldError,
  ValidationException,
} from '../../../common/exceptions/validation.exception';

@Injectable()
export class ContentValidatorService {
  constructor(
    @InjectRepository(ContentEntry)
    private readonly entryRepo: Repository<ContentEntry>,
  ) {}

  async validate(
    fields: FieldDefinition[],
    data: Record<string, any>,
    contentTypeId: string,
    excludeEntryId?: string,
  ): Promise<void> {
    const errors: FieldError[] = [];

    for (const field of fields) {
      const value = data[field.slug];
      const v = field.validations;

      if (v.required && (value === undefined || value === null || value === '')) {
        errors.push({ field: field.slug, message: `${field.name} is required` });
        continue;
      }

      if (value === undefined || value === null) continue;

      this.validateType(field, value, errors);

      if (typeof value === 'string') {
        if (v.minLength && value.length < v.minLength) {
          errors.push({
            field: field.slug,
            message: `${field.name} must be at least ${v.minLength} characters`,
          });
        }
        if (v.maxLength && value.length > v.maxLength) {
          errors.push({
            field: field.slug,
            message: `${field.name} must be at most ${v.maxLength} characters`,
          });
        }
        if (v.pattern) {
          const regex = new RegExp(v.pattern);
          if (!regex.test(value)) {
            errors.push({
              field: field.slug,
              message: `${field.name} does not match the required pattern`,
            });
          }
        }
      }

      if (typeof value === 'number') {
        if (v.min !== undefined && value < v.min) {
          errors.push({
            field: field.slug,
            message: `${field.name} must be at least ${v.min}`,
          });
        }
        if (v.max !== undefined && value > v.max) {
          errors.push({
            field: field.slug,
            message: `${field.name} must be at most ${v.max}`,
          });
        }
      }

      if (v.unique) {
        const query = this.entryRepo
          .createQueryBuilder('entry')
          .where('entry.contentTypeId = :contentTypeId', { contentTypeId })
          .andWhere(`entry.data ->> :slug = :value`, {
            slug: field.slug,
            value: String(value),
          });

        if (excludeEntryId) {
          query.andWhere('entry.id != :excludeId', { excludeId: excludeEntryId });
        }

        const duplicate = await query.getOne();
        if (duplicate) {
          errors.push({
            field: field.slug,
            message: `${field.name} must be unique. Value already exists.`,
          });
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationException(errors);
    }
  }

  private validateType(
    field: FieldDefinition,
    value: any,
    errors: FieldError[],
  ): void {
    switch (field.fieldType) {
      case FieldType.TEXT:
      case FieldType.RICHTEXT:
        if (typeof value !== 'string') {
          errors.push({ field: field.slug, message: `${field.name} must be a string` });
        }
        break;
      case FieldType.NUMBER:
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({ field: field.slug, message: `${field.name} must be a number` });
        }
        break;
      case FieldType.BOOLEAN:
        if (typeof value !== 'boolean') {
          errors.push({ field: field.slug, message: `${field.name} must be a boolean` });
        }
        break;
      case FieldType.DATE:
        if (typeof value !== 'string' || isNaN(Date.parse(value))) {
          errors.push({ field: field.slug, message: `${field.name} must be a valid date` });
        }
        break;
      case FieldType.JSON:
        if (typeof value !== 'object') {
          errors.push({ field: field.slug, message: `${field.name} must be a JSON object` });
        }
        break;
      case FieldType.RELATION:
        if (typeof value !== 'string' && !Array.isArray(value)) {
          errors.push({
            field: field.slug,
            message: `${field.name} must be a reference ID or array of IDs`,
          });
        }
        break;
    }
  }
}
