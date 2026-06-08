import { Form, Input, InputNumber, Switch, DatePicker, Card, Button } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { FieldDefinition, ContentType } from '../types/content-type';
import { FieldType } from '../types/content-type';
import type { Rule } from 'antd/es/form';
import type { FormInstance } from 'antd';
import RelationSelect from './RelationSelect';

interface DynamicFieldProps {
  field: FieldDefinition;
  contentTypes?: ContentType[];
  form?: FormInstance;
  namePrefix?: (string | number)[];
}

export default function DynamicField({ field, contentTypes = [], form, namePrefix = [] }: DynamicFieldProps) {
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

  const fieldName = [...namePrefix, field.slug];

  const shouldShow = (): boolean => {
    if (!field.validations.showWhen || !form) return true;
    const condition = field.validations.showWhen as { field: string; value: any; operator?: string };
    const depValue = form.getFieldValue([...namePrefix, condition.field]);
    switch (condition.operator || 'eq') {
      case 'eq': return depValue === condition.value;
      case 'neq': return depValue !== condition.value;
      case 'exists': return !!depValue;
      case 'gt': return depValue > condition.value;
      case 'lt': return depValue < condition.value;
      default: return true;
    }
  };

  if (!shouldShow()) return null;

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
        if (field.validations.nestedFields) {
          return null;
        }
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

  if (field.fieldType === FieldType.JSON && field.validations.nestedFields) {
    const nestedFields = field.validations.nestedFields as FieldDefinition[];
    const isRepeatable = field.validations.repeatable;

    if (isRepeatable) {
      return (
        <Form.Item label={field.name}>
          <Form.List name={fieldName}>
            {(fields, { add, remove }) => (
              <div>
                {fields.map((listField, index) => (
                  <Card
                    key={listField.key}
                    size="small"
                    title={`${field.name} #${index + 1}`}
                    style={{ marginBottom: 8 }}
                    extra={<MinusCircleOutlined onClick={() => remove(listField.name)} />}
                  >
                    {nestedFields.map((nf) => (
                      <DynamicField
                        key={nf.slug}
                        field={nf}
                        contentTypes={contentTypes}
                        form={form}
                        namePrefix={[...fieldName, listField.name]}
                      />
                    ))}
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Add {field.name}
                </Button>
              </div>
            )}
          </Form.List>
        </Form.Item>
      );
    }

    return (
      <Card title={field.name} size="small" style={{ marginBottom: 16 }}>
        {nestedFields.map((nf) => (
          <DynamicField
            key={nf.slug}
            field={nf}
            contentTypes={contentTypes}
            form={form}
            namePrefix={fieldName}
          />
        ))}
      </Card>
    );
  }

  return (
    <Form.Item
      name={fieldName}
      label={field.name}
      rules={rules}
      valuePropName={field.fieldType === FieldType.BOOLEAN ? 'checked' : 'value'}
    >
      {renderInput()}
    </Form.Item>
  );
}
