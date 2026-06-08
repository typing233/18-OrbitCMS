import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@Controller('api/v1/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('admin', 'auditor')
  @ApiOperation({ summary: 'Get audit logs' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('resource') resource?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
  ) {
    return this.auditService.findByTenant(tenantId, { page, pageSize, resource, action, userId });
  }
}
