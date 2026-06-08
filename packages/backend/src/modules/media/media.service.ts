import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';
import { pipeline } from 'stream/promises';
import { MediaAsset, MediaStatus } from '../../entities/media-asset.entity';
import { AuditService } from '../auth/audit.service';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');

  constructor(
    @InjectRepository(MediaAsset)
    private readonly mediaRepo: Repository<MediaAsset>,
    private readonly auditService: AuditService,
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

    try {
      return await this.mediaRepo.save(asset);
    } catch (err: any) {
      if (err.code === '23505' && err.detail?.includes('contentHash')) {
        const existing = await this.mediaRepo.findOne({
          where: { contentHash: asset.contentHash!, tenantId: asset.tenantId, id: Not(asset.id) },
        });
        if (existing) {
          asset.contentHash = null;
          asset.metadata = { ...asset.metadata, duplicateOf: existing.id };
          return this.mediaRepo.save(asset);
        }
      }
      throw err;
    }
  }

  private async assembleChunks(asset: MediaAsset) {
    const chunkDir = path.join(this.uploadDir, asset.tenantId, asset.id, 'chunks');
    const outputPath = path.join(this.uploadDir, asset.storagePath);

    const writeStream = fs.createWriteStream(outputPath);
    for (let i = 0; i < asset.totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `${i}`);
      const chunkStream = fs.createReadStream(chunkPath);
      await pipeline(chunkStream, writeStream, { end: false });
    }
    writeStream.end();
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const hash = crypto.createHash('sha256');
    const readStream = fs.createReadStream(outputPath);
    for await (const chunk of readStream) {
      hash.update(chunk);
    }
    asset.contentHash = hash.digest('hex');

    const duplicate = await this.mediaRepo.findOne({
      where: { contentHash: asset.contentHash, tenantId: asset.tenantId, id: Not(asset.id) },
    });
    if (duplicate) {
      asset.metadata = { ...asset.metadata, duplicateOf: duplicate.id };
    }

    fs.rmSync(chunkDir, { recursive: true, force: true });
  }

  async finalizeUpload(assetId: string, tenantId: string): Promise<MediaAsset> {
    const asset = await this.mediaRepo.findOne({ where: { id: assetId, tenantId } });
    if (!asset) throw new NotFoundException('Media asset not found');

    if (asset.metadata?.duplicateOf) {
      const existing = await this.mediaRepo.findOne({
        where: { id: asset.metadata.duplicateOf, tenantId },
      });
      if (existing && existing.status === MediaStatus.READY) {
        asset.status = MediaStatus.READY;
        asset.metadata = { ...asset.metadata, deduplicatedFrom: existing.id };
        const saved = await this.mediaRepo.save(asset);
        await this.auditService.log({
          tenantId,
          userId: asset.uploadedById,
          action: 'media.upload.deduplicated',
          resource: 'media',
          resourceId: saved.id,
          after: { filename: saved.filename, duplicateOf: existing.id },
        });
        return saved;
      }
    }

    asset.status = MediaStatus.READY;
    asset.variants = await this.generateVariants(asset);
    const saved = await this.mediaRepo.save(asset);

    await this.auditService.log({
      tenantId,
      userId: asset.uploadedById,
      action: 'media.upload',
      resource: 'media',
      resourceId: saved.id,
      after: { filename: saved.filename, mimeType: saved.mimeType, size: saved.size, contentHash: saved.contentHash },
    });

    return saved;
  }

  private async generateVariants(asset: MediaAsset): Promise<{ name: string; path: string; mimeType: string; size: number }[]> {
    const variants: { name: string; path: string; mimeType: string; size: number }[] = [];
    if (!asset.mimeType.startsWith('image/')) return variants;

    const sourcePath = path.join(this.uploadDir, asset.storagePath);
    if (!fs.existsSync(sourcePath)) return variants;

    const thumbPath = `${asset.storagePath}_thumb.webp`;
    const mediumPath = `${asset.storagePath}_medium.webp`;
    const thumbFull = path.join(this.uploadDir, thumbPath);
    const mediumFull = path.join(this.uploadDir, mediumPath);

    try {
      await (sharp as any)(sourcePath)
        .resize(150, 150, { fit: 'cover' })
        .webp({ quality: 70 })
        .toFile(thumbFull);

      await (sharp as any)(sourcePath)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(mediumFull);

      const thumbStat = fs.statSync(thumbFull);
      const mediumStat = fs.statSync(mediumFull);

      variants.push(
        { name: 'thumbnail', path: thumbPath, mimeType: 'image/webp', size: thumbStat.size },
        { name: 'medium', path: mediumPath, mimeType: 'image/webp', size: mediumStat.size },
      );
      asset.thumbnailPath = thumbPath;
    } catch (err) {
      this.logger.warn(`Failed to generate variants for ${asset.id}: ${err}`);
      try {
        fs.copyFileSync(sourcePath, thumbFull.replace('.webp', ''));
        fs.copyFileSync(sourcePath, mediumFull.replace('.webp', ''));
        const fallbackThumb = thumbPath.replace('.webp', '');
        const fallbackMedium = mediumPath.replace('.webp', '');
        const tStat = fs.statSync(path.join(this.uploadDir, fallbackThumb));
        const mStat = fs.statSync(path.join(this.uploadDir, fallbackMedium));
        variants.push(
          { name: 'thumbnail', path: fallbackThumb, mimeType: asset.mimeType, size: tStat.size },
          { name: 'medium', path: fallbackMedium, mimeType: asset.mimeType, size: mStat.size },
        );
        asset.thumbnailPath = fallbackThumb;
      } catch {
        this.logger.error(`Fallback variant generation also failed for ${asset.id}`);
      }
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
    for (const variant of asset.variants || []) {
      const variantPath = path.join(this.uploadDir, variant.path);
      if (fs.existsSync(variantPath)) fs.unlinkSync(variantPath);
    }

    await this.auditService.log({
      tenantId,
      userId: asset.uploadedById,
      action: 'media.delete',
      resource: 'media',
      resourceId: id,
      before: { filename: asset.filename, mimeType: asset.mimeType, size: asset.size },
    });

    await this.mediaRepo.remove(asset);
  }

  async addReference(id: string, tenantId: string, ref: { contentTypeId: string; entryId: string; fieldSlug: string }) {
    const asset = await this.findOne(id, tenantId);
    const alreadyReferenced = asset.references.some(
      (r) => r.entryId === ref.entryId && r.fieldSlug === ref.fieldSlug,
    );
    if (alreadyReferenced) return asset;
    asset.references = [...asset.references, ref];
    asset.referenceCount = asset.references.length;
    const saved = await this.mediaRepo.save(asset);

    await this.auditService.log({
      tenantId,
      userId: null,
      action: 'media.reference.add',
      resource: 'media',
      resourceId: id,
      after: ref,
    });

    return saved;
  }

  async removeReference(id: string, tenantId: string, entryId: string) {
    const asset = await this.findOne(id, tenantId);
    const removed = asset.references.filter((r) => r.entryId === entryId);
    asset.references = asset.references.filter((r) => r.entryId !== entryId);
    asset.referenceCount = asset.references.length;
    const saved = await this.mediaRepo.save(asset);

    if (removed.length > 0) {
      await this.auditService.log({
        tenantId,
        userId: null,
        action: 'media.reference.remove',
        resource: 'media',
        resourceId: id,
        before: { entryId, references: removed },
      });
    }

    return saved;
  }

  async syncReferencesForEntry(
    tenantId: string,
    entryId: string,
    contentTypeId: string,
    mediaIds: { fieldSlug: string; assetId: string }[],
  ): Promise<void> {
    const existingAssets = await this.mediaRepo.find({
      where: { tenantId },
    });

    const referencedAssets = existingAssets.filter(
      (a) => a.references.some((r) => r.entryId === entryId),
    );

    for (const asset of referencedAssets) {
      const stillReferenced = mediaIds.some((m) => m.assetId === asset.id);
      if (!stillReferenced) {
        asset.references = asset.references.filter((r) => r.entryId !== entryId);
        asset.referenceCount = asset.references.length;
        await this.mediaRepo.save(asset);
      }
    }

    for (const { fieldSlug, assetId } of mediaIds) {
      try {
        await this.addReference(assetId, tenantId, { contentTypeId, entryId, fieldSlug });
      } catch {
        // Asset may have been deleted concurrently
      }
    }
  }

  async removeAllReferencesForEntry(tenantId: string, entryId: string): Promise<void> {
    const assets = await this.mediaRepo
      .createQueryBuilder('media')
      .where('media.tenantId = :tenantId', { tenantId })
      .andWhere(`media.references @> :ref::jsonb`, { ref: JSON.stringify([{ entryId }]) })
      .getMany();

    for (const asset of assets) {
      asset.references = asset.references.filter((r) => r.entryId !== entryId);
      asset.referenceCount = asset.references.length;
      await this.mediaRepo.save(asset);
    }
  }

  async checkDuplicate(tenantId: string, contentHash: string): Promise<MediaAsset | null> {
    return this.mediaRepo.findOne({ where: { tenantId, contentHash } });
  }

  async getPreviewUrl(id: string, tenantId: string, variant?: string): Promise<string> {
    const asset = await this.findOne(id, tenantId);
    if (variant && asset.variants) {
      const v = asset.variants.find((vr) => vr.name === variant);
      if (v) return `/uploads/${v.path}`;
    }
    if (asset.thumbnailPath) return `/uploads/${asset.thumbnailPath}`;
    return `/uploads/${asset.storagePath}`;
  }
}
