import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Avatar, Dropdown, Space } from 'antd';
import {
  DatabaseOutlined,
  AppstoreOutlined,
  FileImageOutlined,
  UserOutlined,
  SafetyOutlined,
  AuditOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Sider, Header, Content } = Layout;

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();

  const menuItems = [
    {
      key: '/content-types',
      icon: <DatabaseOutlined />,
      label: 'Content Types',
    },
    {
      key: '/content',
      icon: <AppstoreOutlined />,
      label: 'Content',
    },
    {
      key: '/media',
      icon: <FileImageOutlined />,
      label: 'Media Library',
    },
    ...(hasRole('admin') ? [
      {
        key: '/users',
        icon: <UserOutlined />,
        label: 'Users',
      },
      {
        key: '/roles',
        icon: <SafetyOutlined />,
        label: 'Roles',
      },
    ] : []),
    ...((hasRole('admin') || hasRole('auditor')) ? [
      {
        key: '/audit',
        icon: <AuditOutlined />,
        label: 'Audit Logs',
      },
    ] : []),
  ];

  const getSelectedKey = () => {
    if (location.pathname.startsWith('/content-types')) return '/content-types';
    if (location.pathname.startsWith('/content')) return '/content';
    if (location.pathname.startsWith('/media')) return '/media';
    if (location.pathname.startsWith('/users')) return '/users';
    if (location.pathname.startsWith('/roles')) return '/roles';
    if (location.pathname.startsWith('/audit')) return '/audit';
    return '/content-types';
  };

  const userMenuItems = [
    { key: 'profile', label: `${user?.email}`, disabled: true },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Typography.Title level={4} style={{ margin: 0, color: '#4f46e5' }}>
            {collapsed ? 'O' : 'OrbitCMS'}
          </Typography.Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography.Text type="secondary">Headless Content Management</Typography.Text>
          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: ({ key }) => {
                if (key === 'logout') {
                  logout();
                  navigate('/login');
                }
              },
            }}
          >
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} src={user?.avatarUrl} />
              <Typography.Text>{user?.displayName}</Typography.Text>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px', padding: '24px', background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
