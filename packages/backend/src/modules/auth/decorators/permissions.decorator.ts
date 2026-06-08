import { SetMetadata } from '@nestjs/common';
import { PermissionAction } from '../../../entities/permission.entity';

export interface RequiredPermission {
  resource: string;
  action: PermissionAction;
}

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
