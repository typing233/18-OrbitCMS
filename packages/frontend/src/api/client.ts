import axios from 'axios';

const client = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('orbit_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const tenantId = localStorage.getItem('orbit_tenant_id');
  if (tenantId) {
    config.headers['x-tenant-id'] = tenantId;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('orbit_refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
          localStorage.setItem('orbit_access_token', data.accessToken);
          localStorage.setItem('orbit_refresh_token', data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return client(originalRequest);
        } catch {
          localStorage.removeItem('orbit_access_token');
          localStorage.removeItem('orbit_refresh_token');
          window.location.href = '/login';
        }
      }
    }
    const message = error.response?.data?.message || error.message || 'An error occurred';
    return Promise.reject({ message, errors: error.response?.data?.errors });
  },
);

export default client;
