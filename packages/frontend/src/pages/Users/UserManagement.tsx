import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Tag, Space, Modal, Select, message, Typography, Card } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { getUsers, updateUserRoles, deactivateUser, activateUser, getRoles } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';

const { Title } = Typography;

export default function UserManagement() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
    enabled: hasRole('admin'),
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
    enabled: hasRole('admin'),
  });

  const updateRolesMut = useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) => updateUserRoles(id, roleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      message.success('Roles updated');
      setRoleModalVisible(false);
    },
  });

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? activateUser(id) : deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      message.success('User status updated');
    },
  });

  const columns = [
    { title: 'Name', dataIndex: 'displayName', key: 'displayName' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Roles',
      key: 'roles',
      render: (_: any, record: any) => (
        <Space>
          {record.roles?.map((r: any) => (
            <Tag key={r.id} color="blue">{r.name}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: any) => (
        <Tag color={record.isActive ? 'green' : 'red'}>
          {record.isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setSelectedUser(record);
              setSelectedRoles(record.roles?.map((r: any) => r.id) || []);
              setRoleModalVisible(true);
            }}
          >
            Edit Roles
          </Button>
          <Button
            size="small"
            danger={record.isActive}
            onClick={() => toggleActiveMut.mutate({ id: record.id, active: !record.isActive })}
          >
            {record.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={3}><UserOutlined /> User Management</Title>
      <Card>
        <Table
          dataSource={usersData?.data || []}
          columns={columns}
          loading={isLoading}
          rowKey="id"
          pagination={{ total: usersData?.meta?.total, pageSize: 20 }}
        />
      </Card>

      <Modal
        title={`Edit Roles - ${selectedUser?.displayName}`}
        open={roleModalVisible}
        onOk={() => updateRolesMut.mutate({ id: selectedUser.id, roleIds: selectedRoles })}
        onCancel={() => setRoleModalVisible(false)}
        confirmLoading={updateRolesMut.isPending}
      >
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          value={selectedRoles}
          onChange={setSelectedRoles}
          options={roles?.map((r: any) => ({ label: r.name, value: r.id })) || []}
        />
      </Modal>
    </div>
  );
}
