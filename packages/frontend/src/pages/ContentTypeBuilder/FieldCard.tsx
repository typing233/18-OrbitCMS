import { Card, Tag, Button, Space, Typography } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  UpOutlined,
  DownOutlined,
  FontSizeOutlined,
  NumberOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  CalendarOutlined,
  CodeOutlined,
  LinkOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { FieldType } from '../../types/content-type';

const { Text } = Typography;

const fieldTypeIcons: Record<FieldType, React.ReactNode> = {
  [FieldType.TEXT]: <FontSizeOutlined />,
  [FieldType.NUMBER]: <NumberOutlined />,
  [FieldType.RICHTEXT]: <FileTextOutlined />,
  [FieldType.BOOLEAN]: <CheckSquareOutlined />,
  [FieldType.DATE]: <CalendarOutlined />,
  [FieldType.JSON]: <CodeOutlined />,
  [FieldType.RELATION]: <LinkOutlined />,
  [FieldType.MEDIA]: <PictureOutlined />,
};

const fieldTypeColors: Record<FieldType, string> = {
  [FieldType.TEXT]: 'blue',
  [FieldType.NUMBER]: 'green',
  [FieldType.RICHTEXT]: 'purple',
  [FieldType.BOOLEAN]: 'orange',
  [FieldType.DATE]: 'cyan',
  [FieldType.JSON]: 'magenta',
  [FieldType.RELATION]: 'gold',
  [FieldType.MEDIA]: 'volcano',
};

interface FieldCardProps {
  field: {
    tempId: string;
    name: string;
    slug: string;
    fieldType: FieldType;
    validations: Record<string, any>;
  };
  index: number;
  totalFields: number;
  onEdit: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export default function FieldCard({
  field,
  index,
  totalFields,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
}: FieldCardProps) {
  return (
    <Card size="small" hoverable onClick={onEdit} style={{ cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Space size={4}>
            <Button
              size="small"
              type="text"
              icon={<UpOutlined />}
              disabled={index === 0}
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            />
            <Button
              size="small"
              type="text"
              icon={<DownOutlined />}
              disabled={index === totalFields - 1}
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            />
          </Space>
          <Tag icon={fieldTypeIcons[field.fieldType]} color={fieldTypeColors[field.fieldType]}>
            {field.fieldType}
          </Tag>
          <Text strong>{field.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>({field.slug})</Text>
          {field.validations?.required && <Tag color="red">Required</Tag>}
          {field.validations?.unique && <Tag color="orange">Unique</Tag>}
        </Space>
        <Space>
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          />
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
          />
        </Space>
      </div>
    </Card>
  );
}
