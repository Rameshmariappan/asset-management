import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from './tenant-context.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.tenantId) {
      this.tenantContext.setTenantId(user.tenantId);
      this.tenantContext.setIsPlatformAdmin(user.isPlatformAdmin ?? false);

      // PLATFORM_ADMIN can override tenant via X-Org-Id header
      if (user.isPlatformAdmin) {
        const orgIdHeader = request.headers['x-org-id'];
        if (orgIdHeader) {
          const org = await this.prisma.organization.findUnique({
            where: { id: orgIdHeader },
          });
          if (org && org.isActive) {
            this.tenantContext.setTenantId(orgIdHeader);
          }
        }
      }
    }

    return next.handle();
  }
}
