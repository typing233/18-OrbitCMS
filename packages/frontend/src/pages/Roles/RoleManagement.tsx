import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Input, Space, message, Typography, Card, Tag, Popconfirm } from 'antd';
import { SafetyOutlined, PlusOutlined } from '@ant-design/icons';
import { getRoles, createRole, updateRole, deleteRole } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';

const { Title } = Typography;

export default function RoleManagement() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
    enabled: hasRole('admin'),
  });

  const createMut = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      message.success('Role created');
      setModalVisible(false);
      form.resetFields();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      message.success('Role updated');
      setModalVisible(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      message.success('Role deleted');
    },
  });

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingRole) {
      updateMut.mutate({ id: editingRole.id, data: values });
    } else {
      createMut.mutate({ ...values, slug: values.name.toLowerCase().replace(/\s+/g, '-') });
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Slug', dataIndex: 'slug', key: 'slug' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    {
      title: 'Type',
      key: 'type',
      render: (_: any, record: any) => (
        <Tag color={record.isSystem ? 'orange' : 'blue'}>
          {record.isSystem ? 'System' : 'Custom'}
        </Tag>
      ),
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_: any, record: any) => (
        <span>{record.permissions?.length || 0} assigned</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            disabled={record.isSystem}
            onClick={() => {
              setEditingRole(record);
              form.setFieldsValue(record);
              setModalVisible(true);
            }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this role?"
            onConfirm={() => deleteMut.mutate(record.id)}
            disabled={record.isSystem}
          >
            <Button size="small" danger disabled={record.isSystem}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}><SafetyOutlined /> Role Management</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRole(null);
            form.resetFields();
            setModalVisible(true);
          }}
        >
          New Role
        </Button>
      </div>
      <Card>
        <Table
          dataSource={roles || []}
          columns={columns}
          loading={isLoading}
          rowKey="id"
        />
      </Card>

      <Modal
        title={editingRole ? 'Edit Role' : 'Create Role'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={createMut.isPending || updateMut.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
