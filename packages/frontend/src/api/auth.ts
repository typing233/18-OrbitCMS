import client from './client';

export interface LoginRequest {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  tenantSlug?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    tenantId: string;
    roles: { id: string; name: string; slug: string }[];
  };
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await client.post('/api/v1/auth/login', data);
  return res.data;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const res = await client.post('/api/v1/auth/register', data);
  return res.data;
}

export async function getMe() {
  const res = await client.get('/api/v1/auth/me');
  return res.data;
}

export async function refreshToken(token: string): Promise<AuthResponse> {
  const res = await client.post('/api/v1/auth/refresh', { refreshToken: token });
  return res.data;
}
