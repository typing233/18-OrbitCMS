import { useQuery } from '@tanstack/react-query';
import { Table, Typography, Card, Tag, Space, Select } from 'antd';
import { AuditOutlined } from '@ant-design/icons';
import { getAuditLogs } from '../../api/users';
import { useState } from 'react';

const { Title } = Typography;

export default function AuditLogPage() {
  const [filters, setFilters] = useState<{ resource?: string; action?: string }>({});
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, filters],
    queryFn: () => getAuditLogs({ page, pageSize: 30, ...filters }),
  });

  const columns = [
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleString(),
      width: 180,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    { title: 'Resource', dataIndex: 'resource', key: 'resource' },
    { title: 'Resource ID', dataIndex: 'resourceId', key: 'resourceId', ellipsis: true },
    { title: 'User ID', dataIndex: 'userId', key: 'userId', ellipsis: true },
    {
      title: 'Changes',
      key: 'changes',
      render: (_: any, record: any) => (
        <Space>
          {record.before && <Tag color="red">Before</Tag>}
          {record.after && <Tag color="green">After</Tag>}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={3}><AuditOutlined /> Audit Logs</Title>
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Filter by resource"
          allowClear
          style={{ width: 150 }}
          onChange={(v) => setFilters((f) => ({ ...f, resource: v }))}
          options={[
            { label: 'User', value: 'user' },
            { label: 'Role', value: 'role' },
            { label: 'Content', value: 'content' },
            { label: 'Media', value: 'media' },
          ]}
        />
        <Select
          placeholder="Filter by action"
          allowClear
          style={{ width: 200 }}
          onChange={(v) => setFilters((f) => ({ ...f, action: v }))}
          options={[
            { label: 'Login', value: 'user.login' },
            { label: 'Register', value: 'user.register' },
            { label: 'Role Update', value: 'user.roles.update' },
            { label: 'Role Create', value: 'role.create' },
            { label: 'Permissions Update', value: 'role.permissions.update' },
          ]}
        />
      </Space>
      <Card>
        <Table
          dataSource={data?.data || []}
          columns={columns}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: page,
            total: data?.meta?.total,
            pageSize: 30,
            onChange: setPage,
          }}
          expandable={{
            expandedRowRender: (record: any) => (
              <pre style={{ fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
                {JSON.stringify({ before: record.before, after: record.after, metadata: record.metadata }, null, 2)}
              </pre>
            ),
          }}
        />
      </Card>
    </div>
  );
}
