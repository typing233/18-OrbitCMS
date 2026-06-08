import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsObject,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FieldType } from '../../../common/enums/field-type.enum';

export class ShowWhenConditionDto {
  @IsString()
  field: string;

  value: any;

  @IsOptional()
  @IsString()
  operator?: string;
}

export class FieldValidationsDto {
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  unique?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minLength?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxLength?: number;

  @IsOptional()
  min?: number;

  @IsOptional()
  max?: number;

  @IsOptional()
  @IsString()
  pattern?: string;

  @IsOptional()
  @IsObject()
  showWhen?: ShowWhenConditionDto;

  @IsOptional()
  @IsArray()
  nestedFields?: any[];

  @IsOptional()
  @IsBoolean()
  repeatable?: boolean;
}

export class RelationConfigDto {
  @IsString()
  @IsNotEmpty()
  targetContentTypeId: string;

  @IsString()
  @IsNotEmpty()
  relationType: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
}

export class CreateFieldDefinitionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsEnum(FieldType)
  fieldType: FieldType;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FieldValidationsDto)
  validations?: FieldValidationsDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RelationConfigDto)
  relationConfig?: RelationConfigDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateContentTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFieldDefinitionDto)
  fields: CreateFieldDefinitionDto[];
}
