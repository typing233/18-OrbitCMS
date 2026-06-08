import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { PermissionAction } from '../../entities/permission.entity';

@ApiTags('Content')
@Controller('api/v1/content/:contentTypeSlug')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List entries for a content type' })
  async findAll(
    @Param('contentTypeSlug') slug: string,
    @Query() pagination: PaginationDto,
    @CurrentUser('tenantId') tenantId?: string,
  ) {
    return this.contentService.findAll(slug, pagination, tenantId);
  }

  @Get('options')
  @Public()
  @ApiOperation({ summary: 'List entry options for relation select (id + label)' })
  async options(
    @Param('contentTypeSlug') slug: string,
    @Query('search') search?: string,
  ) {
    return this.contentService.getOptions(slug, search);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a single entry' })
  async findOne(
    @Param('contentTypeSlug') slug: string,
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId?: string,
  ) {
    return this.contentService.findOne(slug, id, tenantId);
  }

  @Get(':id/versions')
  @Roles('admin', 'editor', 'auditor')
  @ApiOperation({ summary: 'Get version history for an entry' })
  async getVersions(
    @Param('contentTypeSlug') slug: string,
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId?: string,
  ) {
    return this.contentService.getVersions(slug, id, tenantId);
  }

  @Post()
  @RequirePermissions({ resource: 'content', action: PermissionAction.CREATE })
  @ApiOperation({ summary: 'Create a new entry' })
  async create(
    @Param('contentTypeSlug') slug: string,
    @Body() body: Record<string, any>,
    @CurrentUser('tenantId') tenantId?: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.contentService.create(slug, body, { tenantId, userId });
  }

  @Put(':id')
  @RequirePermissions({ resource: 'content', action: PermissionAction.UPDATE })
  @ApiOperation({ summary: 'Update an entry (with conflict detection)' })
  async update(
    @Param('contentTypeSlug') slug: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser('tenantId') tenantId?: string,
    @CurrentUser('id') userId?: string,
    @Headers('x-expected-version') expectedVersion?: string,
  ) {
    return this.contentService.update(slug, id, body, {
      tenantId,
      userId,
      expectedVersion: expectedVersion ? Number(expectedVersion) : undefined,
    });
  }

  @Post(':id/publish')
  @RequirePermissions({ resource: 'content', action: PermissionAction.PUBLISH })
  @ApiOperation({ summary: 'Publish an entry' })
  async publish(
    @Param('contentTypeSlug') slug: string,
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId?: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.contentService.publish(slug, id, { tenantId, userId });
  }

  @Post(':id/unpublish')
  @RequirePermissions({ resource: 'content', action: PermissionAction.PUBLISH })
  @ApiOperation({ summary: 'Unpublish an entry' })
  async unpublish(
    @Param('contentTypeSlug') slug: string,
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId?: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.contentService.unpublish(slug, id, { tenantId, userId });
  }

  @Post(':id/rollback')
  @RequirePermissions({ resource: 'content', action: PermissionAction.UPDATE })
  @ApiOperation({ summary: 'Rollback to a previous version' })
  async rollback(
    @Param('contentTypeSlug') slug: string,
    @Param('id') id: string,
    @Body() body: { targetVersion: number },
    @CurrentUser('tenantId') tenantId?: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.contentService.rollback(slug, id, body.targetVersion, { tenantId, userId });
  }

  @Post(':id/lock')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Lock entry for editing' })
  async lock(
    @Param('contentTypeSlug') slug: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId?: string,
  ) {
    return this.contentService.lock(slug, id, userId, tenantId);
  }

  @Post(':id/unlock')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Unlock entry' })
  async unlock(
    @Param('contentTypeSlug') slug: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId?: string,
  ) {
    return this.contentService.unlock(slug, id, userId, tenantId);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'content', action: PermissionAction.DELETE })
  @ApiOperation({ summary: 'Delete an entry' })
  async remove(
    @Param('contentTypeSlug') slug: string,
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId?: string,
  ) {
    await this.contentService.remove(slug, id, tenantId);
    return { message: 'Entry deleted successfully' };
  }
}
