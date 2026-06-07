import { useEffect } from 'react';
import {
  Drawer,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Button,
  Space,
  Divider,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { FieldType } from '../../types/content-type';
import { getContentTypes } from '../../api/content-types';

function generateId(): string {
  return crypto.randomUUID();
}

interface FieldFormData {
  tempId: string;
  name: string;
  slug: string;
  fieldType: FieldType;
  validations: Record<string, any>;
  relationConfig: any;
  sortOrder: number;
}

interface FieldConfigDrawerProps {
  open: boolean;
  editingField: FieldFormData | null;
  onClose: () => void;
  onSave: (field: FieldFormData) => void;
}

const fieldTypeOptions = [
  { value: FieldType.TEXT, label: 'Text' },
  { value: FieldType.NUMBER, label: 'Number' },
  { value: FieldType.RICHTEXT, label: 'Rich Text' },
  { value: FieldType.BOOLEAN, label: 'Boolean' },
  { value: FieldType.DATE, label: 'Date' },
  { value: FieldType.JSON, label: 'JSON' },
  { value: FieldType.RELATION, label: 'Relation' },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function FieldConfigDrawer({
  open,
  editingField,
  onClose,
  onSave,
}: FieldConfigDrawerProps) {
  const [form] = Form.useForm();
  const fieldType = Form.useWatch('fieldType', form);

  const { data: contentTypes } = useQuery({
    queryKey: ['content-types'],
    queryFn: getContentTypes,
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      if (editingField) {
        form.setFieldsValue({
          name: editingField.name,
          slug: editingField.slug,
          fieldType: editingField.fieldType,
          required: editingField.validations?.required || false,
          unique: editingField.validations?.unique || false,
          minLength: editingField.validations?.minLength,
          maxLength: editingField.validations?.maxLength,
          min: editingField.validations?.min,
          max: editingField.validations?.max,
          pattern: editingField.validations?.pattern,
          targetContentTypeId: editingField.relationConfig?.targetContentTypeId,
          relationType: editingField.relationConfig?.relationType || 'manyToOne',
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, editingField, form]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!editingField) {
      form.setFieldValue('slug', slugify(name));
    }
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const fieldData: FieldFormData = {
      tempId: editingField?.tempId || generateId(),
      name: values.name,
      slug: values.slug,
      fieldType: values.fieldType,
      validations: {
        required: values.required || false,
        unique: values.unique || false,
        ...(values.minLength !== undefined && { minLength: values.minLength }),
        ...(values.maxLength !== undefined && { maxLength: values.maxLength }),
        ...(values.min !== undefined && { min: values.min }),
        ...(values.max !== undefined && { max: values.max }),
        ...(values.pattern && { pattern: values.pattern }),
      },
      relationConfig: values.fieldType === FieldType.RELATION
        ? { targetContentTypeId: values.targetContentTypeId, relationType: values.relationType || 'manyToOne' }
        : null,
      sortOrder: editingField?.sortOrder || 0,
    };
    onSave(fieldData);
    form.resetFields();
  };

  const showStringValidations = fieldType === FieldType.TEXT || fieldType === FieldType.RICHTEXT;
  const showNumberValidations = fieldType === FieldType.NUMBER;
  const showRelationConfig = fieldType === FieldType.RELATION;

  const contentTypeOptions = (contentTypes || []).map((ct) => ({
    value: ct.id,
    label: ct.name,
  }));

  return (
    <Drawer
      title={editingField ? 'Edit Field' : 'Add Field'}
      placement="right"
      width={400}
      open={open}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={handleSave}>
            {editingField ? 'Update' : 'Add'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" initialValues={{ fieldType: FieldType.TEXT, relationType: 'manyToOne' }}>
        <Form.Item
          name="name"
          label="Field Name"
          rules={[{ required: true, message: 'Field name is required' }]}
        >
          <Input placeholder="e.g. Title" onChange={handleNameChange} />
        </Form.Item>

        <Form.Item
          name="slug"
          label="Slug"
          rules={[{ required: true, message: 'Slug is required' }]}
        >
          <Input placeholder="auto-generated" />
        </Form.Item>

        <Form.Item
          name="fieldType"
          label="Type"
          rules={[{ required: true }]}
        >
          <Select options={fieldTypeOptions} />
        </Form.Item>

        <Divider orientation="left">Validations</Divider>

        <Form.Item name="required" label="Required" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="unique" label="Unique" valuePropName="checked">
          <Switch />
        </Form.Item>

        {showStringValidations && (
          <>
            <Form.Item name="minLength" label="Min Length">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="maxLength" label="Max Length">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="pattern" label="Regex Pattern">
              <Input placeholder="e.g. ^[a-z]+$" />
            </Form.Item>
          </>
        )}

        {showNumberValidations && (
          <>
            <Form.Item name="min" label="Minimum Value">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="max" label="Maximum Value">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </>
        )}

        {showRelationConfig && (
          <>
            <Divider orientation="left">Relation Config</Divider>
            <Form.Item
              name="targetContentTypeId"
              label="Target Content Type"
              rules={[{ required: true, message: 'Please select a target content type' }]}
            >
              <Select
                placeholder="Select target content type"
                options={contentTypeOptions}
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string || '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
            <Form.Item name="relationType" label="Relation Type">
              <Select
                options={[
                  { value: 'oneToOne', label: 'One to One' },
                  { value: 'oneToMany', label: 'One to Many' },
                  { value: 'manyToOne', label: 'Many to One' },
                  { value: 'manyToMany', label: 'Many to Many' },
                ]}
              />
            </Form.Item>
          </>
        )}
      </Form>
    </Drawer>
  );
}
