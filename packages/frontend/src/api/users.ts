import client from './client';

export async function getUsers(page = 1, pageSize = 20) {
  const res = await client.get('/users', { params: { page, pageSize } });
  return res.data;
}

export async function getUser(id: string) {
  const res = await client.get(`/users/${id}`);
  return res.data;
}

export async function updateUserRoles(id: string, roleIds: string[]) {
  const res = await client.put(`/users/${id}/roles`, { roleIds });
  return res.data;
}

export async function deactivateUser(id: string) {
  const res = await client.put(`/users/${id}/deactivate`);
  return res.data;
}

export async function activateUser(id: string) {
  const res = await client.put(`/users/${id}/activate`);
  return res.data;
}

export async function getRoles() {
  const res = await client.get('/roles');
  return res.data;
}

export async function getRole(id: string) {
  const res = await client.get(`/roles/${id}`);
  return res.data;
}

export async function createRole(data: { name: string; slug: string; description?: string; parentRoleId?: string }) {
  const res = await client.post('/roles', data);
  return res.data;
}

export async function updateRole(id: string, data: { name?: string; description?: string }) {
  const res = await client.put(`/roles/${id}`, data);
  return res.data;
}

export async function deleteRole(id: string) {
  const res = await client.delete(`/roles/${id}`);
  return res.data;
}

export async function assignPermissions(roleId: string, permissions: any[]) {
  const res = await client.put(`/roles/${roleId}/permissions`, { permissions });
  return res.data;
}

export async function getAuditLogs(params: { page?: number; pageSize?: number; resource?: string; action?: string }) {
  const res = await client.get('/audit', { params });
  return res.data;
}
