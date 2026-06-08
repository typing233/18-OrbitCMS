import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Upload, Button, Table, Image, Tag, Space, Progress, message, Typography, Modal, Popconfirm } from 'antd';
import { UploadOutlined, DeleteOutlined, FileImageOutlined, FileOutlined } from '@ant-design/icons';
import { getMediaAssets, deleteMediaAsset, uploadFile } from '../../api/media';

const { Title } = Typography;

export default function MediaLibrary() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<any>(null);

  const { data: mediaData, isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: () => getMediaAssets({}),
  });

  const deleteMut = useMutation({
    mutationFn: deleteMediaAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      message.success('Asset deleted');
    },
    onError: (err: any) => message.error(err.message),
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      await uploadFile(file, (percent) => setUploadProgress(percent));
      queryClient.invalidateQueries({ queryKey: ['media'] });
      message.success('Upload complete');
    } catch (err: any) {
      message.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const columns = [
    {
      title: 'Preview',
      key: 'preview',
      width: 80,
      render: (_: any, record: any) =>
        record.mimeType?.startsWith('image/') ? (
          <Image width={48} height={48} src={`/uploads/${record.storagePath}`} style={{ objectFit: 'cover', borderRadius: 4 }} preview={false} />
        ) : (
          <FileOutlined style={{ fontSize: 32 }} />
        ),
    },
    { title: 'Filename', dataIndex: 'filename', key: 'filename' },
    { title: 'Type', dataIndex: 'mimeType', key: 'mimeType' },
    {
      title: 'Size',
      key: 'size',
      render: (_: any, record: any) => `${(record.size / 1024 / 1024).toFixed(2)} MB`,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: any) => (
        <Tag color={record.status === 'ready' ? 'green' : record.status === 'processing' ? 'blue' : 'orange'}>
          {record.status}
        </Tag>
      ),
    },
    {
      title: 'References',
      dataIndex: 'referenceCount',
      key: 'referenceCount',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            onClick={() => { setPreviewAsset(record); setPreviewVisible(true); }}
          >
            Details
          </Button>
          <Popconfirm
            title="Delete this asset?"
            onConfirm={() => deleteMut.mutate(record.id)}
            disabled={record.referenceCount > 0}
          >
            <Button size="small" danger icon={<DeleteOutlined />} disabled={record.referenceCount > 0} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}><FileImageOutlined /> Media Library</Title>
        <Upload
          showUploadList={false}
          beforeUpload={(file) => { handleUpload(file); return false; }}
        >
          <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
            Upload File
          </Button>
        </Upload>
      </div>
      {uploading && <Progress percent={uploadProgress} style={{ marginBottom: 16 }} />}
      <Card>
        <Table
          dataSource={mediaData?.data || []}
          columns={columns}
          loading={isLoading}
          rowKey="id"
          pagination={{ total: mediaData?.meta?.total, pageSize: 20 }}
        />
      </Card>

      <Modal
        title="Asset Details"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={600}
      >
        {previewAsset && (
          <div>
            {previewAsset.mimeType?.startsWith('image/') && (
              <Image src={`/uploads/${previewAsset.storagePath}`} style={{ maxWidth: '100%', marginBottom: 16 }} />
            )}
            <p><strong>Filename:</strong> {previewAsset.filename}</p>
            <p><strong>MIME Type:</strong> {previewAsset.mimeType}</p>
            <p><strong>Size:</strong> {(previewAsset.size / 1024 / 1024).toFixed(2)} MB</p>
            <p><strong>Hash:</strong> {previewAsset.contentHash}</p>
            <p><strong>References:</strong> {previewAsset.referenceCount}</p>
            <p><strong>Variants:</strong> {previewAsset.variants?.length || 0}</p>
            {previewAsset.variants?.map((v: any, i: number) => (
              <Tag key={i}>{v.name}</Tag>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
