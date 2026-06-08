import { Controller, Get, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('api/v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all users in tenant' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.usersService.findAll(tenantId, page, pageSize);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get user details' })
  async findOne(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.usersService.findOne(id, tenantId);
  }

  @Put(':id/roles')
  @Roles('admin')
  @ApiOperation({ summary: 'Update user roles' })
  async updateRoles(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() body: { roleIds: string[] },
  ) {
    return this.usersService.updateRoles(id, tenantId, body.roleIds, actorId);
  }

  @Put(':id/deactivate')
  @Roles('admin')
  @ApiOperation({ summary: 'Deactivate a user' })
  async deactivate(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.usersService.deactivate(id, tenantId, actorId);
  }

  @Put(':id/activate')
  @Roles('admin')
  @ApiOperation({ summary: 'Activate a user' })
  async activate(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.usersService.activate(id, tenantId, actorId);
  }
}
