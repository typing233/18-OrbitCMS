import client from './client';
import type { ContentEntry, PaginatedResponse } from '../types/content-type';

export interface GetEntriesParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export async function getEntries(
  slug: string,
  params?: GetEntriesParams,
): Promise<PaginatedResponse<ContentEntry>> {
  const { data } = await client.get(`/content/${slug}`, { params });
  return data;
}

export async function getEntry(slug: string, id: string): Promise<ContentEntry> {
  const { data } = await client.get(`/content/${slug}/${id}`);
  return data;
}

export async function createEntry(
  slug: string,
  payload: Record<string, any>,
): Promise<ContentEntry> {
  const { data } = await client.post(`/content/${slug}`, payload);
  return data;
}

export async function updateEntry(
  slug: string,
  id: string,
  payload: Record<string, any>,
): Promise<ContentEntry> {
  const { data } = await client.put(`/content/${slug}/${id}`, payload);
  return data;
}

export async function deleteEntry(slug: string, id: string): Promise<void> {
  await client.delete(`/content/${slug}/${id}`);
}
