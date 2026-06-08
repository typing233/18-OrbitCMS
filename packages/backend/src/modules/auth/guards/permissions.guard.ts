import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, RequiredPermission } from '../decorators/permissions.decorator';
import { PermissionAction } from '../../../entities/permission.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredPermission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    if (!user || !user.roles) return false;

    const userPermissions = this.flattenPermissions(user);

    return required.every((req) => this.checkPermission(userPermissions, req, request));
  }

  private flattenPermissions(user: any): any[] {
    const perms: any[] = [];
    for (const role of user.roles || []) {
      if (role.slug === 'admin') {
        perms.push({ resource: '*', action: PermissionAction.MANAGE, conditions: null, fieldRestrictions: null });
      }
      for (const perm of role.permissions || []) {
        perms.push(perm);
      }
    }
    return perms;
  }

  private checkPermission(userPerms: any[], required: RequiredPermission, request: any): boolean {
    return userPerms.some((perm) => {
      if (perm.resource === '*' && perm.action === PermissionAction.MANAGE) return true;
      if (perm.resource !== required.resource && perm.resource !== '*') return false;
      if (perm.action !== required.action && perm.action !== PermissionAction.MANAGE) return false;

      if (perm.conditions) {
        if (!this.evaluateConditions(perm.conditions, request)) return false;
      }
      return true;
    });
  }

  private evaluateConditions(conditions: Record<string, any>, request: any): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (key === 'ownOnly' && value === true) {
        const user = request.user;
        const resourceUserId = request.params?.userId || request.body?.userId;
        if (resourceUserId && resourceUserId !== user.id) return false;
      }
      if (key === 'tenantId') {
        if (request.user.tenantId !== value) return false;
      }
    }
    return true;
  }
}
