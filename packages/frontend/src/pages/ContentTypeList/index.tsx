import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Space, Popconfirm, Typography, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { getContentTypes, deleteContentType } from '../../api/content-types';
import type { ContentType } from '../../types/content-type';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function ContentTypeList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: contentTypes, isLoading } = useQuery({
    queryKey: ['content-types'],
    queryFn: getContentTypes,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContentType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-types'] });
      message.success('Content type deleted');
    },
    onError: () => {
      message.error('Failed to delete content type');
    },
  });

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ContentType) => (
        <a onClick={() => navigate(`/content-types/${record.id}/edit`)}>{name}</a>
      ),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      render: (slug: string) => <Tag>{slug}</Tag>,
    },
    {
      title: 'Fields',
      key: 'fields',
      render: (_: any, record: ContentType) => record.fields?.length || 0,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ContentType) => (
        <Space>
          <Button
            type="link"
            icon={<UnorderedListOutlined />}
            onClick={() => navigate(`/content/${record.slug}`)}
          >
            Entries
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/content-types/${record.id}/edit`)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this content type?"
            description="All entries will be permanently deleted."
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Delete"
            okType="danger"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Content Types</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/content-types/new')}
        >
          New Content Type
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={contentTypes}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
      />
    </div>
  );
}
