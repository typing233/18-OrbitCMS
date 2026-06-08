import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RolesService } from './roles.service';
import { PermissionAction } from '../../entities/permission.entity';

@ApiTags('Roles')
@Controller('api/v1/roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles('admin', 'auditor')
  @ApiOperation({ summary: 'List all roles' })
  async findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.rolesService.findAll(tenantId);
  }

  @Get(':id')
  @Roles('admin', 'auditor')
  @ApiOperation({ summary: 'Get role details' })
  async findOne(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.rolesService.findOne(id, tenantId);
  }

  @Get(':id/effective-permissions')
  @Roles('admin', 'auditor')
  @ApiOperation({ summary: 'Get effective permissions (including inherited)' })
  async getEffective(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.rolesService.getEffectivePermissions(id, tenantId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new role' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() body: { name: string; slug: string; description?: string; parentRoleId?: string },
  ) {
    return this.rolesService.create(tenantId, body, actorId);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a role' })
  async update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() body: { name?: string; description?: string; parentRoleId?: string | null },
  ) {
    return this.rolesService.update(id, tenantId, body, actorId);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a role' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    await this.rolesService.delete(id, tenantId, actorId);
    return { message: 'Role deleted' };
  }

  @Put(':id/permissions')
  @Roles('admin')
  @ApiOperation({ summary: 'Assign permissions to role' })
  async assignPermissions(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() body: { permissions: { resource: string; action: PermissionAction; conditions?: Record<string, any>; fieldRestrictions?: any }[] },
  ) {
    return this.rolesService.assignPermissions(id, tenantId, body.permissions, actorId);
  }
}
