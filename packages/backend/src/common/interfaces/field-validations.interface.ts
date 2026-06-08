export interface FieldValidations {
  required?: boolean;
  unique?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  showWhen?: { field: string; value: any; operator?: string };
  nestedFields?: any[];
  repeatable?: boolean;
}
