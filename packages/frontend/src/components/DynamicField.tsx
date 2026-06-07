import { Form, Input, InputNumber, Switch, DatePicker } from 'antd';
import type { FieldDefinition, ContentType } from '../types/content-type';
import { FieldType } from '../types/content-type';
import type { Rule } from 'antd/es/form';
import RelationSelect from './RelationSelect';

interface DynamicFieldProps {
  field: FieldDefinition;
  contentTypes?: ContentType[];
}

export default function DynamicField({ field, contentTypes = [] }: DynamicFieldProps) {
  const rules: Rule[] = [];

  if (field.validations.required) {
    rules.push({ required: true, message: `${field.name} is required` });
  }
  if (field.validations.minLength) {
    rules.push({ min: field.validations.minLength, message: `Min ${field.validations.minLength} characters` });
  }
  if (field.validations.maxLength) {
    rules.push({ max: field.validations.maxLength, message: `Max ${field.validations.maxLength} characters` });
  }
  if (field.validations.pattern) {
    rules.push({ pattern: new RegExp(field.validations.pattern), message: `Does not match required pattern` });
  }

  const renderInput = () => {
    switch (field.fieldType) {
      case FieldType.TEXT:
        return <Input placeholder={`Enter ${field.name.toLowerCase()}`} />;

      case FieldType.NUMBER:
        return (
          <InputNumber
            style={{ width: '100%' }}
            min={field.validations.min}
            max={field.validations.max}
            placeholder={`Enter ${field.name.toLowerCase()}`}
          />
        );

      case FieldType.RICHTEXT:
        return <Input.TextArea rows={6} placeholder={`Enter ${field.name.toLowerCase()}`} />;

      case FieldType.BOOLEAN:
        return <Switch />;

      case FieldType.DATE:
        return <DatePicker style={{ width: '100%' }} />;

      case FieldType.JSON:
        return (
          <Input.TextArea
            rows={4}
            placeholder='{"key": "value"}'
            style={{ fontFamily: 'monospace' }}
          />
        );

      case FieldType.RELATION: {
        if (!field.relationConfig) {
          return <Input placeholder="Relation not configured" disabled />;
        }
        const isMulti = field.relationConfig.relationType === 'oneToMany' ||
                        field.relationConfig.relationType === 'manyToMany';
        return (
          <RelationSelect
            targetContentTypeId={field.relationConfig.targetContentTypeId}
            contentTypes={contentTypes}
            multiple={isMulti}
          />
        );
      }

      default:
        return <Input placeholder={`Enter ${field.name.toLowerCase()}`} />;
    }
  };

  return (
    <Form.Item
      name={field.slug}
      label={field.name}
      rules={rules}
      valuePropName={field.fieldType === FieldType.BOOLEAN ? 'checked' : 'value'}
    >
      {renderInput()}
    </Form.Item>
  );
}
