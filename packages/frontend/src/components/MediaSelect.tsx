import { useState } from 'react';
import { Select, Spin, Space, Image } from 'antd';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';

interface MediaSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  mimeType?: string;
}

export default function MediaSelect({ value, onChange, mimeType }: MediaSelectProps) {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['media-assets', mimeType, search],
    queryFn: () =>
      client.get('/media', { params: { pageSize: 50, mimeType } }).then((r) => r.data),
  });

  const assets = data?.data || [];

  return (
    <Select
      showSearch
      placeholder="Select media asset..."
      value={value}
      onChange={onChange}
      onSearch={setSearch}
      filterOption={(input, option) =>
        (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
      }
      notFoundContent={isLoading ? <Spin size="small" /> : 'No assets found'}
      options={assets.map((asset: any) => ({
        value: asset.id,
        label: asset.filename,
      }))}
      optionRender={(option) => {
        const asset = assets.find((a: any) => a.id === option.value);
        return (
          <Space>
            {asset?.mimeType?.startsWith('image/') && asset?.thumbnailPath && (
              <Image
                src={`/uploads/${asset.thumbnailPath}`}
                width={24}
                height={24}
                preview={false}
                style={{ objectFit: 'cover', borderRadius: 2 }}
              />
            )}
            <span>{option.label}</span>
          </Space>
        );
      }}
      allowClear
      style={{ width: '100%' }}
    />
  );
}
