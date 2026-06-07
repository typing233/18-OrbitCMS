import client from './client';
import type { ContentType } from '../types/content-type';

export async function getContentTypes(): Promise<ContentType[]> {
  const { data } = await client.get('/content-types');
  return data;
}

export async function getContentType(idOrSlug: string): Promise<ContentType> {
  const { data } = await client.get(`/content-types/${idOrSlug}`);
  return data;
}

export async function createContentType(
  payload: Omit<ContentType, 'id' | 'createdAt' | 'updatedAt' | 'slug'> & { fields: any[] },
): Promise<ContentType> {
  const { data } = await client.post('/content-types', payload);
  return data;
}

export async function updateContentType(
  id: string,
  payload: Partial<ContentType> & { fields?: any[] },
): Promise<ContentType> {
  const { data } = await client.put(`/content-types/${id}`, payload);
  return data;
}

export async function deleteContentType(id: string): Promise<void> {
  await client.delete(`/content-types/${id}`);
}
