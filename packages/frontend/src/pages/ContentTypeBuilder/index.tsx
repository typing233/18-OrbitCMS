import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Form,
  Input,
  Button,
  Card,
  Space,
  Typography,
  message,
  Divider,
} from 'antd';
import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { getContentType, createContentType, updateContentType } from '../../api/content-types';
import { FieldType } from '../../types/content-type';
import type { FieldDefinition } from '../../types/content-type';
import FieldCard from './FieldCard';
import FieldConfigDrawer from './FieldConfigDrawer';

const { Title, Text } = Typography;

interface FieldFormData {
  tempId: string;
  name: string;
  slug: string;
  fieldType: FieldType;
  validations: Record<string, any>;
  relationConfig: any;
  sortOrder: number;
}

export default function ContentTypeBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const [fields, setFields] = useState<FieldFormData[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldFormData | null>(null);

  const { data: contentType } = useQuery({
    queryKey: ['content-type', id],
    queryFn: () => getContentType(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (contentType) {
      form.setFieldsValue({
        name: contentType.name,
        description: contentType.description,
      });
      setFields(
        contentType.fields.map((f: FieldDefinition) => ({
          tempId: f.id,
          name: f.name,
          slug: f.slug,
          fieldType: f.fieldType,
          validations: f.validations,
          relationConfig: f.relationConfig,
          sortOrder: f.sortOrder,
        })),
      );
    }
  }, [contentType, form]);

  const createMutation = useMutation({
    mutationFn: createContentType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-types'] });
      message.success('Content type created');
      navigate('/content-types');
    },
    onError: (err: any) => {
      message.error(err.message || 'Failed to create');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateContentType(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-types'] });
      queryClient.invalidateQueries({ queryKey: ['content-type', id] });
      message.success('Content type updated');
      navigate('/content-types');
    },
    onError: (err: any) => {
      message.error(err.message || 'Failed to update');
    },
  });

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = {
      name: values.name,
      description: values.description,
      fields: fields.map((f, idx) => ({
        name: f.name,
        slug: f.slug,
        fieldType: f.fieldType,
        validations: f.validations || {},
        relationConfig: f.relationConfig || null,
        sortOrder: idx,
      })),
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const handleAddField = () => {
    setEditingField(null);
    setDrawerOpen(true);
  };

  const handleEditField = (field: FieldFormData) => {
    setEditingField(field);
    setDrawerOpen(true);
  };

  const handleSaveField = (fieldData: FieldFormData) => {
    if (editingField) {
      setFields((prev) =>
        prev.map((f) => (f.tempId === editingField.tempId ? fieldData : f)),
      );
    } else {
      setFields((prev) => [...prev, fieldData]);
    }
    setDrawerOpen(false);
  };

  const handleRemoveField = (tempId: string) => {
    setFields((prev) => prev.filter((f) => f.tempId !== tempId));
  };

  const handleMoveField = (fromIndex: number, toIndex: number) => {
    setFields((prev) => {
      const newFields = [...prev];
      const [moved] = newFields.splice(fromIndex, 1);
      newFields.splice(toIndex, 0, moved);
      return newFields;
    });
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          {isEdit ? 'Edit Content Type' : 'New Content Type'}
        </Title>
        <Space>
          <Button onClick={() => navigate('/content-types')}>Cancel</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSubmit}
            loading={isLoading}
          >
            {isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="e.g. Blog Post" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Describe this content type..." />
          </Form.Item>
        </Form>
      </Card>

      <Divider orientation="left">Fields</Divider>

      {fields.length === 0 && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          No fields defined yet. Add fields to define the structure of your content.
        </Text>
      )}

      <Space direction="vertical" style={{ width: '100%' }}>
        {fields.map((field, index) => (
          <FieldCard
            key={field.tempId}
            field={field}
            index={index}
            totalFields={fields.length}
            onEdit={() => handleEditField(field)}
            onRemove={() => handleRemoveField(field.tempId)}
            onMoveUp={() => handleMoveField(index, index - 1)}
            onMoveDown={() => handleMoveField(index, index + 1)}
          />
        ))}
      </Space>

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddField}
        style={{ width: '100%', marginTop: 16 }}
      >
        Add Field
      </Button>

      <FieldConfigDrawer
        open={drawerOpen}
        editingField={editingField}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveField}
      />
    </div>
  );
}
