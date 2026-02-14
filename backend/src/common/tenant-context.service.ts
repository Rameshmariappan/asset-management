import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class TenantContextService {
  constructor(private readonly cls: ClsService) {}

  setTenantId(tenantId: string): void {
    this.cls.set('tenantId', tenantId);
  }

  getTenantId(): string | null {
    return this.cls.get('tenantId') ?? null;
  }

  setIsPlatformAdmin(value: boolean): void {
    this.cls.set('isPlatformAdmin', value);
  }

  getIsPlatformAdmin(): boolean {
    return this.cls.get('isPlatformAdmin') ?? false;
  }
}
