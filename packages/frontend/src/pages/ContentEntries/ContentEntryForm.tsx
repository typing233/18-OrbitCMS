import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Button, Space, Typography, Card, message, Tag, Drawer, Timeline, Alert } from 'antd';
import { SaveOutlined, HistoryOutlined, SendOutlined, RollbackOutlined } from '@ant-design/icons';
import { getContentType, getContentTypes } from '../../api/content-types';
import { getEntry, createEntry } from '../../api/content';
import DynamicField from '../../components/DynamicField';
import client from '../../api/client';

const { Title, Text } = Typography;

export default function ContentEntryForm() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = !!id;
  const [versionsDrawer, setVersionsDrawer] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);
  const [lockVersion, setLockVersion] = useState<number | undefined>();

  const { data: contentType } = useQuery({
    queryKey: ['content-type', slug],
    queryFn: () => getContentType(slug!),
    enabled: !!slug,
  });

  const { data: allContentTypes } = useQuery({
    queryKey: ['content-types'],
    queryFn: getContentTypes,
  });

  const { data: entry } = useQuery({
    queryKey: ['entry', slug, id],
    queryFn: () => getEntry(slug!, id!),
    enabled: isEdit && !!slug,
  });

  const { data: versions } = useQuery({
    queryKey: ['versions', slug, id],
    queryFn: () => client.get(`/content/${slug}/${id}/versions`).then((r) => r.data),
    enabled: isEdit && !!slug && versionsDrawer,
  });

  useEffect(() => {
    if (entry) {
      form.setFieldsValue(entry.data);
      setLockVersion(entry.lockVersion);
    }
  }, [entry, form]);

  // Acquire lock on edit page mount, release on unmount
  useEffect(() => {
    if (!isEdit || !slug || !id) return;
    client.post(`/content/${slug}/${id}/lock`).catch(() => {});
    return () => {
      client.post(`/content/${slug}/${id}/unlock`).catch(() => {});
    };
  }, [isEdit, slug, id]);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, any>) => createEntry(slug!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', slug] });
      message.success('Entry created as draft');
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
    mutationFn: (data: Record<string, any>) => {
      const headers: any = {};
      if (lockVersion !== undefined) {
        headers['x-expected-version'] = String(lockVersion);
      }
      return client.put(`/content/${slug}/${id}`, data, { headers }).then((r) => r.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['entries', slug] });
      queryClient.invalidateQueries({ queryKey: ['entry', slug, id] });
      setLockVersion(data.lockVersion);
      message.success('Entry updated');
    },
    onError: (err: any) => {
      if (err.message?.includes('Conflict')) {
        setConflictData(err);
      } else if (err.errors) {
        err.errors.forEach((e: any) => {
          form.setFields([{ name: e.field, errors: [e.message] }]);
        });
      } else {
        message.error(err.message || 'Failed to update entry');
      }
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => client.post(`/content/${slug}/${id}/publish`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entry', slug, id] });
      message.success('Entry published');
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => client.post(`/content/${slug}/${id}/unpublish`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entry', slug, id] });
      message.success('Entry unpublished');
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: (targetVersion: number) =>
      client.post(`/content/${slug}/${id}/rollback`, { targetVersion }).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['entry', slug, id] });
      form.setFieldsValue(data.data);
      message.success('Rolled back successfully');
      setVersionsDrawer(false);
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
  const isPublished = entry?.status === 'published';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Space>
          <Title level={3} style={{ margin: 0 }}>
            {isEdit ? 'Edit' : 'New'} {contentType?.name || slug} Entry
          </Title>
          {isEdit && (
            <Tag color={isPublished ? 'green' : 'orange'}>
              {entry?.status || 'draft'}
            </Tag>
          )}
          {isEdit && entry?.currentVersion && (
            <Text type="secondary">v{entry.currentVersion}</Text>
          )}
        </Space>
        <Space>
          {isEdit && (
            <>
              <Button icon={<HistoryOutlined />} onClick={() => setVersionsDrawer(true)}>
                Versions
              </Button>
              {isPublished ? (
                <Button onClick={() => unpublishMutation.mutate()} loading={unpublishMutation.isPending}>
                  Unpublish
                </Button>
              ) : (
                <Button
                  icon={<SendOutlined />}
                  onClick={() => publishMutation.mutate()}
                  loading={publishMutation.isPending}
                  type="default"
                >
                  Publish
                </Button>
              )}
            </>
          )}
          <Button onClick={() => navigate(`/content/${slug}`)}>Cancel</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSubmit}
            loading={isLoading}
          >
            {isEdit ? 'Save Draft' : 'Create'}
          </Button>
        </Space>
      </div>

      {conflictData && (
        <Alert
          type="error"
          message="Edit Conflict"
          description="This entry was modified by another user. Please reload and merge your changes."
          closable
          onClose={() => setConflictData(null)}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['entry', slug, id] });
              setConflictData(null);
            }}>
              Reload
            </Button>
          }
        />
      )}

      <Card>
        <Form form={form} layout="vertical">
          {contentType?.fields
            .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
            .map((field: any) => (
              <DynamicField key={field.slug} field={field} contentTypes={allContentTypes} form={form} />
            ))}
        </Form>
      </Card>

      <Drawer
        title="Version History"
        open={versionsDrawer}
        onClose={() => setVersionsDrawer(false)}
        width={400}
      >
        <Timeline
          items={versions?.map((v: any) => ({
            children: (
              <div>
                <Space>
                  <Tag>v{v.version}</Tag>
                  <Tag color={v.status === 'published' ? 'green' : 'blue'}>{v.status}</Tag>
                </Space>
                <div><Text type="secondary">{new Date(v.createdAt).toLocaleString()}</Text></div>
                {v.changeNote && <div><Text italic>{v.changeNote}</Text></div>}
                <Button
                  size="small"
                  icon={<RollbackOutlined />}
                  onClick={() => rollbackMutation.mutate(v.version)}
                  style={{ marginTop: 4 }}
                >
                  Rollback
                </Button>
              </div>
            ),
          })) || []}
        />
      </Drawer>
    </div>
  );
}
