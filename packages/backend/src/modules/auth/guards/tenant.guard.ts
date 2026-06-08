import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.headers['x-tenant-id'] || request.params?.tenantId;

    if (tenantId && user && user.tenantId !== tenantId) {
      const isAdmin = user.roles?.some((r: any) => r.slug === 'admin');
      if (!isAdmin) {
        throw new ForbiddenException('Access denied: tenant isolation violation');
      }
    }

    if (user) {
      request.tenantId = user.tenantId;
    }

    return true;
  }
}
