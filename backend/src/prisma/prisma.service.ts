import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { TenantContextService } from '../common/tenant-context.service';

// Models that are scoped per tenant
const TENANT_SCOPED_MODELS: Prisma.ModelName[] = [
  'User',
  'Department',
  'Category',
  'Vendor',
  'Location',
  'Asset',
  'AssetAssignment',
  'AssetTransfer',
  'AuditLog',
  'Notification',
];

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(
    @Optional() @Inject(TenantContextService)
    private readonly tenantContext?: TenantContextService,
  ) {
    super({
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'colorless',
    });
  }

  async onModuleInit() {
    // Register tenant filtering middleware
    this.$use(async (params, next) => {
      if (!params.model || !TENANT_SCOPED_MODELS.includes(params.model as Prisma.ModelName)) {
        return next(params);
      }

      const tenantId = this.tenantContext?.getTenantId();
      if (!tenantId) {
        // No tenant context (public routes like login/register) — skip filtering
        return next(params);
      }

      // Inject tenantId based on operation type
      switch (params.action) {
        case 'findFirst':
        case 'findMany':
        case 'count':
        case 'aggregate':
        case 'groupBy':
          params.args = params.args || {};
          params.args.where = { ...params.args.where, tenantId };
          break;

        case 'findUnique':
        case 'findUniqueOrThrow':
          // Convert findUnique to findFirst with tenantId
          // (findUnique requires unique fields only — compound uniques may not include tenantId)
          params.action = 'findFirst';
          params.args = params.args || {};
          params.args.where = { ...params.args.where, tenantId };
          break;

        case 'create':
          params.args = params.args || {};
          params.args.data = { ...params.args.data, tenantId };
          break;

        case 'createMany':
          params.args = params.args || {};
          if (Array.isArray(params.args.data)) {
            params.args.data = params.args.data.map((d: any) => ({ ...d, tenantId }));
          } else {
            params.args.data = { ...params.args.data, tenantId };
          }
          break;

        case 'update':
        case 'delete':
          params.args = params.args || {};
          params.args.where = { ...params.args.where, tenantId };
          break;

        case 'updateMany':
        case 'deleteMany':
          params.args = params.args || {};
          params.args.where = { ...params.args.where, tenantId };
          break;

        case 'upsert':
          params.args = params.args || {};
          params.args.where = { ...params.args.where, tenantId };
          params.args.create = { ...params.args.create, tenantId };
          break;
      }

      return next(params);
    });

    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  /**
   * Clean database (for testing purposes)
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && key[0] !== '_' && key[0] !== '$',
    );

    return Promise.all(
      models.map((modelKey) => {
        return (this[modelKey as string] as any).deleteMany();
      }),
    );
  }
}
