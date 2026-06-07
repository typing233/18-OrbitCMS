import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Space, Typography, Popconfirm, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getContentType } from '../../api/content-types';
import { getEntries, deleteEntry } from '../../api/content';
import type { ContentEntry, FieldDefinition } from '../../types/content-type';
import { FieldType } from '../../types/content-type';
import { useState } from 'react';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function ContentEntryList() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: contentType } = useQuery({
    queryKey: ['content-type', slug],
    queryFn: () => getContentType(slug!),
    enabled: !!slug,
  });

  const { data: entriesResponse, isLoading } = useQuery({
    queryKey: ['entries', slug, page, pageSize],
    queryFn: () => getEntries(slug!, { page, pageSize }),
    enabled: !!slug,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEntry(slug!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', slug] });
      message.success('Entry deleted');
    },
  });

  const renderCellValue = (value: any, field: FieldDefinition) => {
    if (value === null || value === undefined) return <Tag>—</Tag>;
    switch (field.fieldType) {
      case FieldType.BOOLEAN:
        return value ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag>;
      case FieldType.DATE:
        return dayjs(value).format('YYYY-MM-DD');
      case FieldType.JSON:
        return <Tag>JSON</Tag>;
      case FieldType.RICHTEXT:
        return String(value).substring(0, 80) + (String(value).length > 80 ? '...' : '');
      case FieldType.RELATION:
        return <Tag color="blue">{String(value).substring(0, 8)}...</Tag>;
      default:
        return String(value).substring(0, 100);
    }
  };

  const columns = [
    ...(contentType?.fields || []).slice(0, 5).map((field: FieldDefinition) => ({
      title: field.name,
      key: field.slug,
      render: (_: any, record: ContentEntry) => renderCellValue(record.data[field.slug], field),
    })),
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: any, record: ContentEntry) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/content/${slug}/${record.id}/edit`)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this entry?"
            onConfirm={() => deleteMutation.mutate(record.id)}
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
        <Title level={3} style={{ margin: 0 }}>
          {contentType?.name || slug} Entries
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate(`/content/${slug}/new`)}
        >
          New Entry
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={entriesResponse?.data}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: entriesResponse?.meta?.total,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          showSizeChanger: true,
          showTotal: (total) => `${total} entries`,
        }}
      />
    </div>
  );
}
