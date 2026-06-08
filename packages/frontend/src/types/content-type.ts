export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  RICHTEXT = 'richtext',
  BOOLEAN = 'boolean',
  DATE = 'date',
  JSON = 'json',
  RELATION = 'relation',
}

export interface FieldValidations {
  required?: boolean;
  unique?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  showWhen?: { field: string; value: any; operator?: string };
  nestedFields?: FieldDefinition[];
  repeatable?: boolean;
}

export interface RelationConfig {
  targetContentTypeId: string;
  relationType: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
}

export interface FieldDefinition {
  id: string;
  name: string;
  slug: string;
  fieldType: FieldType;
  validations: FieldValidations;
  relationConfig: RelationConfig | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fields: FieldDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentEntry {
  id: string;
  contentTypeId: string;
  tenantId: string;
  data: Record<string, any>;
  status: 'draft' | 'published' | 'archived';
  publishedData: Record<string, any> | null;
  currentVersion: number;
  lockVersion: number;
  lockedById: string | null;
  lockedAt: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
