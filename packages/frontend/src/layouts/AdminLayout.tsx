import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography } from 'antd';
import {
  DatabaseOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';

const { Sider, Header, Content } = Layout;

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
  ];

  const selectedKey = location.pathname.startsWith('/content-types')
    ? '/content-types'
    : '/content';

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
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
          <Typography.Text type="secondary">Headless Content Management</Typography.Text>
        </Header>
        <Content style={{ margin: '24px', padding: '24px', background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
