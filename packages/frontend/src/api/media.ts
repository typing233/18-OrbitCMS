import client from './client';

export async function initiateUpload(data: { filename: string; mimeType: string; size: number; totalChunks: number }) {
  const res = await client.post('/media/initiate', data);
  return res.data;
}

export async function uploadChunk(assetId: string, chunkIndex: number, chunk: Blob) {
  const formData = new FormData();
  formData.append('chunk', chunk);
  const res = await client.post(`/media/${assetId}/chunk/${chunkIndex}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function finalizeUpload(assetId: string) {
  const res = await client.post(`/media/${assetId}/finalize`);
  return res.data;
}

export async function getMediaAssets(params: { page?: number; pageSize?: number; mimeType?: string }) {
  const res = await client.get('/media', { params });
  return res.data;
}

export async function getMediaAsset(id: string) {
  const res = await client.get(`/media/${id}`);
  return res.data;
}

export async function deleteMediaAsset(id: string) {
  const res = await client.delete(`/media/${id}`);
  return res.data;
}

export async function checkDuplicate(contentHash: string) {
  const res = await client.post('/media/check-duplicate', { contentHash });
  return res.data;
}

const CHUNK_SIZE = 5 * 1024 * 1024;

export async function uploadFile(file: File, onProgress?: (percent: number) => void) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const asset = await initiateUpload({
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    totalChunks,
  });

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    await uploadChunk(asset.id, i, chunk);
    onProgress?.(Math.round(((i + 1) / totalChunks) * 100));
  }

  return finalizeUpload(asset.id);
}
