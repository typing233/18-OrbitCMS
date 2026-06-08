import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PermissionAction } from '../../entities/permission.entity';

@Injectable()
export class FieldPermissionsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) return next.handle();

    const permissions = this.flattenPermissions(user);
    const resource = 'content';

    const readRestrictions = this.getFieldRestrictions(permissions, resource, PermissionAction.READ);
    const writeRestrictions = this.getFieldRestrictions(permissions, resource, PermissionAction.UPDATE);

    if (request.method === 'POST' || request.method === 'PUT') {
      if (writeRestrictions && request.body && typeof request.body === 'object') {
        const deniedFields = this.getDeniedFields(writeRestrictions, Object.keys(request.body));
        if (deniedFields.length > 0) {
          throw new ForbiddenException(
            `You do not have permission to modify fields: ${deniedFields.join(', ')}`,
          );
        }
      }
    }

    if (!readRestrictions) return next.handle();

    return next.handle().pipe(
      map((responseData) => {
        if (!responseData) return responseData;
        return this.filterResponseFields(responseData, readRestrictions);
      }),
    );
  }

  private flattenPermissions(user: any): any[] {
    const perms: any[] = [];
    for (const role of user.roles || []) {
      if (role.slug === 'admin') return [];
      for (const perm of role.permissions || []) {
        perms.push(perm);
      }
    }
    return perms;
  }

  private getFieldRestrictions(
    permissions: any[],
    resource: string,
    action: PermissionAction,
  ): { allowed?: string[]; denied?: string[] } | null {
    if (permissions.length === 0) return null;

    let combined: { allowed?: string[]; denied?: string[] } | null = null;

    for (const perm of permissions) {
      if (perm.resource !== resource && perm.resource !== '*') continue;
      if (perm.action !== action && perm.action !== PermissionAction.MANAGE) continue;
      if (!perm.fieldRestrictions) return null;

      if (!combined) {
        combined = { ...perm.fieldRestrictions };
      } else {
        if (perm.fieldRestrictions.allowed && combined.allowed) {
          combined.allowed = [...new Set([...combined.allowed, ...perm.fieldRestrictions.allowed])];
        } else if (perm.fieldRestrictions.allowed && !combined.allowed) {
          combined.allowed = perm.fieldRestrictions.allowed;
        }
        if (perm.fieldRestrictions.denied && combined.denied) {
          combined.denied = combined.denied.filter((d) => perm.fieldRestrictions.denied.includes(d));
        }
      }
    }

    return combined;
  }

  private getDeniedFields(
    restrictions: { allowed?: string[]; denied?: string[] },
    fields: string[],
  ): string[] {
    const denied: string[] = [];
    for (const field of fields) {
      if (restrictions.denied?.includes(field)) {
        denied.push(field);
      } else if (restrictions.allowed && !restrictions.allowed.includes(field)) {
        denied.push(field);
      }
    }
    return denied;
  }

  private filterResponseFields(data: any, restrictions: { allowed?: string[]; denied?: string[] }): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.filterSingleEntry(item, restrictions));
    }
    if (data && data.data && Array.isArray(data.data)) {
      return { ...data, data: data.data.map((item: any) => this.filterSingleEntry(item, restrictions)) };
    }
    return this.filterSingleEntry(data, restrictions);
  }

  private filterSingleEntry(entry: any, restrictions: { allowed?: string[]; denied?: string[] }): any {
    if (!entry || !entry.data || typeof entry.data !== 'object') return entry;

    const filtered = { ...entry.data };
    for (const key of Object.keys(filtered)) {
      if (restrictions.denied?.includes(key)) {
        delete filtered[key];
      } else if (restrictions.allowed && !restrictions.allowed.includes(key)) {
        delete filtered[key];
      }
    }

    return { ...entry, data: filtered };
  }
}
