import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MediaService } from './media.service';

@ApiTags('Media')
@Controller('api/v1/media')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('initiate')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Initiate a chunked upload' })
  async initiateUpload(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { filename: string; mimeType: string; size: number; totalChunks: number },
  ) {
    return this.mediaService.initiateUpload(tenantId, { ...body, uploadedById: userId });
  }

  @Post(':id/chunk/:index')
  @Roles('admin', 'editor')
  @UseInterceptors(FileInterceptor('chunk'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a chunk' })
  async uploadChunk(
    @Param('id') id: string,
    @Param('index') index: number,
    @CurrentUser('tenantId') tenantId: string,
    @UploadedFile() file: any,
  ) {
    return this.mediaService.uploadChunk(id, tenantId, Number(index), file.buffer);
  }

  @Post(':id/finalize')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Finalize upload and start processing' })
  async finalize(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.mediaService.finalizeUpload(id, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List media assets' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('mimeType') mimeType?: string,
  ) {
    return this.mediaService.findAll(tenantId, { page, pageSize, mimeType });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media asset details' })
  async findOne(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.mediaService.findOne(id, tenantId);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a media asset' })
  async delete(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    await this.mediaService.delete(id, tenantId);
    return { message: 'Media asset deleted' };
  }

  @Post(':id/references')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Add reference tracking' })
  async addReference(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: { contentTypeId: string; entryId: string; fieldSlug: string },
  ) {
    return this.mediaService.addReference(id, tenantId, body);
  }

  @Post('check-duplicate')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Check if file already exists by hash' })
  async checkDuplicate(
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: { contentHash: string },
  ) {
    const existing = await this.mediaService.checkDuplicate(tenantId, body.contentHash);
    return { exists: !!existing, asset: existing };
  }
}
