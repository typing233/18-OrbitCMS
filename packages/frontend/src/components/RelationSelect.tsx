import { useState } from 'react';
import { Select, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import type { ContentType } from '../types/content-type';

interface RelationSelectProps {
  targetContentTypeId: string;
  contentTypes: ContentType[];
  multiple?: boolean;
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
}

async function fetchOptions(slug: string, search?: string): Promise<{ id: string; label: string }[]> {
  const params = search ? { search } : {};
  const { data } = await client.get(`/content/${slug}/options`, { params });
  return data;
}

export default function RelationSelect({
  targetContentTypeId,
  contentTypes,
  multiple = false,
  value,
  onChange,
}: RelationSelectProps) {
  const [search, setSearch] = useState('');

  const targetType = contentTypes.find((ct) => ct.id === targetContentTypeId);
  const targetSlug = targetType?.slug;

  const { data: options, isLoading } = useQuery({
    queryKey: ['relation-options', targetSlug, search],
    queryFn: () => fetchOptions(targetSlug!, search || undefined),
    enabled: !!targetSlug,
  });

  if (!targetSlug) {
    return <Select disabled placeholder="Target content type not found" />;
  }

  return (
    <Select
      mode={multiple ? 'multiple' : undefined}
      showSearch
      placeholder={`Select ${targetType?.name || 'entry'}...`}
      value={value}
      onChange={onChange}
      onSearch={setSearch}
      filterOption={false}
      notFoundContent={isLoading ? <Spin size="small" /> : 'No entries found'}
      options={(options || []).map((opt) => ({
        value: opt.id,
        label: opt.label,
      }))}
      allowClear
      style={{ width: '100%' }}
    />
  );
}
