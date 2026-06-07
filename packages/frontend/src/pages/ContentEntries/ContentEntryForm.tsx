import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Button, Space, Typography, Card, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { getContentType } from '../../api/content-types';
import { getEntry, createEntry, updateEntry } from '../../api/content';
import DynamicField from '../../components/DynamicField';

const { Title } = Typography;

export default function ContentEntryForm() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: contentType } = useQuery({
    queryKey: ['content-type', slug],
    queryFn: () => getContentType(slug!),
    enabled: !!slug,
  });

  const { data: entry } = useQuery({
    queryKey: ['entry', slug, id],
    queryFn: () => getEntry(slug!, id!),
    enabled: isEdit && !!slug,
  });

  useEffect(() => {
    if (entry) {
      form.setFieldsValue(entry.data);
    }
  }, [entry, form]);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, any>) => createEntry(slug!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', slug] });
      message.success('Entry created');
      navigate(`/content/${slug}`);
    },
    onError: (err: any) => {
      if (err.errors) {
        err.errors.forEach((e: any) => {
          form.setFields([{ name: e.field, errors: [e.message] }]);
        });
      } else {
        message.error(err.message || 'Failed to create entry');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, any>) => updateEntry(slug!, id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', slug] });
      message.success('Entry updated');
      navigate(`/content/${slug}`);
    },
    onError: (err: any) => {
      if (err.errors) {
        err.errors.forEach((e: any) => {
          form.setFields([{ name: e.field, errors: [e.message] }]);
        });
      } else {
        message.error(err.message || 'Failed to update entry');
      }
    },
  });

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          {isEdit ? 'Edit' : 'New'} {contentType?.name || slug} Entry
        </Title>
        <Space>
          <Button onClick={() => navigate(`/content/${slug}`)}>Cancel</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSubmit}
            loading={isLoading}
          >
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </Space>
      </div>
      <Card>
        <Form form={form} layout="vertical">
          {contentType?.fields
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((field) => (
              <DynamicField key={field.slug} field={field} />
            ))}
        </Form>
      </Card>
    </div>
  );
}
