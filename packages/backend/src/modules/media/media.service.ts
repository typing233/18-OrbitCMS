import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { MediaAsset, MediaStatus } from '../../entities/media-asset.entity';

@Injectable()
export class MediaService {
  private readonly uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');

  constructor(
    @InjectRepository(MediaAsset)
    private readonly mediaRepo: Repository<MediaAsset>,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async initiateUpload(tenantId: string, dto: {
    filename: string;
    mimeType: string;
    size: number;
    totalChunks: number;
    uploadedById?: string;
  }): Promise<MediaAsset> {
    const asset = this.mediaRepo.create({
      tenantId,
      filename: dto.filename,
      mimeType: dto.mimeType,
      size: dto.size,
      totalChunks: dto.totalChunks,
      chunksReceived: 0,
      storagePath: '',
      status: MediaStatus.UPLOADING,
      uploadedById: dto.uploadedById || null,
    });
    const saved = await this.mediaRepo.save(asset);
    const assetDir = path.join(this.uploadDir, tenantId, saved.id);
    fs.mkdirSync(assetDir, { recursive: true });
    saved.storagePath = path.join(tenantId, saved.id, dto.filename);
    return this.mediaRepo.save(saved);
  }

  async uploadChunk(assetId: string, tenantId: string, chunkIndex: number, data: Buffer): Promise<MediaAsset> {
    const asset = await this.mediaRepo.findOne({ where: { id: assetId, tenantId } });
    if (!asset) throw new NotFoundException('Media asset not found');
    if (asset.status !== MediaStatus.UPLOADING) {
      throw new ConflictException('Upload already completed');
    }

    const chunkDir = path.join(this.uploadDir, tenantId, assetId, 'chunks');
    fs.mkdirSync(chunkDir, { recursive: true });
    fs.writeFileSync(path.join(chunkDir, `${chunkIndex}`), data);

    asset.chunksReceived += 1;

    if (asset.chunksReceived >= asset.totalChunks) {
      await this.assembleChunks(asset);
      asset.status = MediaStatus.PROCESSING;
    }

    return this.mediaRepo.save(asset);
  }

  private async assembleChunks(asset: MediaAsset) {
    const chunkDir = path.join(this.uploadDir, asset.tenantId, asset.id, 'chunks');
    const outputPath = path.join(this.uploadDir, asset.storagePath);
    const writeStream = fs.createWriteStream(outputPath);

    for (let i = 0; i < asset.totalChunks; i++) {
      const chunk = fs.readFileSync(path.join(chunkDir, `${i}`));
      writeStream.write(chunk);
    }
    writeStream.end();

    const fileBuffer = fs.readFileSync(outputPath);
    asset.contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const duplicate = await this.mediaRepo.findOne({
      where: { contentHash: asset.contentHash, tenantId: asset.tenantId },
    });
    if (duplicate && duplicate.id !== asset.id) {
      asset.metadata = { ...asset.metadata, duplicateOf: duplicate.id };
    }

    fs.rmSync(chunkDir, { recursive: true, force: true });
  }

  async finalizeUpload(assetId: string, tenantId: string): Promise<MediaAsset> {
    const asset = await this.mediaRepo.findOne({ where: { id: assetId, tenantId } });
    if (!asset) throw new NotFoundException('Media asset not found');

    asset.status = MediaStatus.READY;
    asset.variants = this.generateVariants(asset);
    return this.mediaRepo.save(asset);
  }

  private generateVariants(asset: MediaAsset): { name: string; path: string; mimeType: string; size: number }[] {
    const variants: { name: string; path: string; mimeType: string; size: number }[] = [];
    if (asset.mimeType.startsWith('image/')) {
      variants.push(
        { name: 'thumbnail', path: `${asset.storagePath}_thumb`, mimeType: asset.mimeType, size: 0 },
        { name: 'medium', path: `${asset.storagePath}_medium`, mimeType: asset.mimeType, size: 0 },
      );
      asset.thumbnailPath = `${asset.storagePath}_thumb`;
    }
    return variants;
  }

  async findAll(tenantId: string, options: { page?: number; pageSize?: number; mimeType?: string }) {
    const { page = 1, pageSize = 20, mimeType } = options;
    const qb = this.mediaRepo
      .createQueryBuilder('media')
      .where('media.tenantId = :tenantId', { tenantId })
      .andWhere('media.status = :status', { status: MediaStatus.READY })
      .orderBy('media.createdAt', 'DESC');

    if (mimeType) {
      qb.andWhere('media.mimeType LIKE :mimeType', { mimeType: `${mimeType}%` });
    }

    const total = await qb.getCount();
    const data = await qb.skip((page - 1) * pageSize).take(pageSize).getMany();

    return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOne(id: string, tenantId: string): Promise<MediaAsset> {
    const asset = await this.mediaRepo.findOne({ where: { id, tenantId } });
    if (!asset) throw new NotFoundException('Media asset not found');
    return asset;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const asset = await this.findOne(id, tenantId);
    if (asset.referenceCount > 0) {
      throw new ConflictException('Cannot delete: asset is still referenced by content entries');
    }
    const filePath = path.join(this.uploadDir, asset.storagePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await this.mediaRepo.remove(asset);
  }

  async addReference(id: string, tenantId: string, ref: { contentTypeId: string; entryId: string; fieldSlug: string }) {
    const asset = await this.findOne(id, tenantId);
    asset.references = [...asset.references, ref];
    asset.referenceCount = asset.references.length;
    return this.mediaRepo.save(asset);
  }

  async removeReference(id: string, tenantId: string, entryId: string) {
    const asset = await this.findOne(id, tenantId);
    asset.references = asset.references.filter((r) => r.entryId !== entryId);
    asset.referenceCount = asset.references.length;
    return this.mediaRepo.save(asset);
  }

  async checkDuplicate(tenantId: string, contentHash: string): Promise<MediaAsset | null> {
    return this.mediaRepo.findOne({ where: { tenantId, contentHash } });
  }
}
