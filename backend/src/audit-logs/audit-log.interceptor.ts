import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogsService } from './audit-logs.service';
import { Reflector } from '@nestjs/core';

/**
 * Decorator to skip audit logging on specific routes
 */
export const SKIP_AUDIT_LOG = 'skipAuditLog';
import { SetMetadata } from '@nestjs/common';
export const SkipAuditLog = () => SetMetadata(SKIP_AUDIT_LOG, true);

/**
 * Maps HTTP methods to audit log actions
 */
const METHOD_ACTION_MAP: Record<string, string> = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

/**
 * Maps controller route prefixes to entity types
 */
const ROUTE_ENTITY_MAP: Record<string, string> = {
  assets: 'Asset',
  users: 'User',
  roles: 'Role',
  permissions: 'Permission',
  assignments: 'Assignment',
  transfers: 'Transfer',
  categories: 'Category',
  vendors: 'Vendor',
  locations: 'Location',
  departments: 'Department',
  notifications: 'Notification',
  tags: 'Tag',
};

/**
 * Routes to skip audit logging (auth, reports, audit-logs themselves, etc.)
 */
const SKIP_ROUTE_PREFIXES = ['auth', 'audit-logs', 'reports'];

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly auditLogsService: AuditLogsService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only intercept mutating methods
    if (!METHOD_ACTION_MAP[method]) {
      return next.handle();
    }

    // Check for @SkipAuditLog() decorator
    const skipAudit = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_LOG, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipAudit) {
      return next.handle();
    }

    // Parse the route to determine entity type
    const url: string = request.route?.path || request.url;
    const basePath = url.split('/').filter(Boolean)[0];

    if (SKIP_ROUTE_PREFIXES.includes(basePath)) {
      return next.handle();
    }

    const entityType = ROUTE_ENTITY_MAP[basePath];
    if (!entityType) {
      return next.handle();
    }

    const action = METHOD_ACTION_MAP[method];
    const user = request.user;
    const userId = user?.userId;
    const ipAddress =
      request.ip || request.connection?.remoteAddress || undefined;
    const userAgent = request.headers?.['user-agent'] || undefined;

    // Extract entity ID from route params (for update/delete)
    const entityId = request.params?.id;

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          // Determine the entity ID from response if it's a create
          const resolvedEntityId =
            entityId || responseData?.id || responseData?.data?.id;

          if (!resolvedEntityId) {
            return;
          }

          const changes: Record<string, any> = {};

          if (action === 'create') {
            changes.after = this.sanitize(responseData?.data || responseData);
          } else if (action === 'update') {
            changes.before = null; // We don't have the before state in an interceptor
            changes.after = this.sanitize(request.body);
          } else if (action === 'delete') {
            changes.before = this.sanitize(responseData?.data || responseData);
          }

          // Fire-and-forget — don't block the response
          this.auditLogsService
            .create({
              entityType,
              entityId: resolvedEntityId,
              action,
              userId,
              changes,
              ipAddress,
              userAgent,
            })
            .catch((err) => {
              console.error('Audit log failed:', err.message);
            });
        },
      }),
    );
  }

  /**
   * Remove sensitive fields from logged data
   */
  private sanitize(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };
    const sensitiveFields = [
      'password',
      'hashedPassword',
      'refreshToken',
      'mfaSecret',
      'accessToken',
      'token',
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
