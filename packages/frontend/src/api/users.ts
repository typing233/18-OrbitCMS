import client from './client';

export async function getUsers(page = 1, pageSize = 20) {
  const res = await client.get('/api/v1/users', { params: { page, pageSize } });
  return res.data;
}

export async function getUser(id: string) {
  const res = await client.get(`/api/v1/users/${id}`);
  return res.data;
}

export async function updateUserRoles(id: string, roleIds: string[]) {
  const res = await client.put(`/api/v1/users/${id}/roles`, { roleIds });
  return res.data;
}

export async function deactivateUser(id: string) {
  const res = await client.put(`/api/v1/users/${id}/deactivate`);
  return res.data;
}

export async function activateUser(id: string) {
  const res = await client.put(`/api/v1/users/${id}/activate`);
  return res.data;
}

export async function getRoles() {
  const res = await client.get('/api/v1/roles');
  return res.data;
}

export async function getRole(id: string) {
  const res = await client.get(`/api/v1/roles/${id}`);
  return res.data;
}

export async function createRole(data: { name: string; slug: string; description?: string; parentRoleId?: string }) {
  const res = await client.post('/api/v1/roles', data);
  return res.data;
}

export async function updateRole(id: string, data: { name?: string; description?: string }) {
  const res = await client.put(`/api/v1/roles/${id}`, data);
  return res.data;
}

export async function deleteRole(id: string) {
  const res = await client.delete(`/api/v1/roles/${id}`);
  return res.data;
}

export async function assignPermissions(roleId: string, permissions: any[]) {
  const res = await client.put(`/api/v1/roles/${roleId}/permissions`, { permissions });
  return res.data;
}

export async function getAuditLogs(params: { page?: number; pageSize?: number; resource?: string; action?: string }) {
  const res = await client.get('/api/v1/audit', { params });
  return res.data;
}
