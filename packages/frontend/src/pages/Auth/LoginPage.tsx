import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { login as apiLogin, register as apiRegister } from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';

const { Title } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const data = await apiLogin(values);
      login(data.accessToken, data.refreshToken, data.user);
      message.success('Login successful');
      navigate('/');
    } catch (err: any) {
      message.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: { email: string; password: string; displayName: string }) => {
    setLoading(true);
    try {
      const data = await apiRegister(values);
      login(data.accessToken, data.refreshToken, data.user);
      message.success('Registration successful');
      navigate('/');
    } catch (err: any) {
      message.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const items = [
    {
      key: 'login',
      label: 'Login',
      children: (
        <Form onFinish={handleLogin} layout="vertical">
          <Form.Item name="email" rules={[{ required: true, type: 'email' }]}>
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            Sign In
          </Button>
        </Form>
      ),
    },
    {
      key: 'register',
      label: 'Register',
      children: (
        <Form onFinish={handleRegister} layout="vertical">
          <Form.Item name="displayName" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} placeholder="Display Name" size="large" />
          </Form.Item>
          <Form.Item name="email" rules={[{ required: true, type: 'email' }]}>
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, min: 6 }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            Sign Up
          </Button>
        </Form>
      ),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <Card style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ color: '#4f46e5', margin: 0 }}>OrbitCMS</Title>
          <Typography.Text type="secondary">Headless Content Management</Typography.Text>
        </div>
        <Tabs items={items} centered />
      </Card>
    </div>
  );
}
