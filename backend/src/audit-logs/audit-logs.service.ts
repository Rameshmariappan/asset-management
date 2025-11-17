import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new audit log entry (immutable)
   * This method is called internally to log changes
   */
  async create(createDto: CreateAuditLogDto) {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        entityType: createDto.entityType,
        entityId: createDto.entityId,
        action: createDto.action,
        userId: createDto.userId,
        changes: createDto.changes,
        ipAddress: createDto.ipAddress,
        userAgent: createDto.userAgent,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return auditLog;
  }

  /**
   * Get all audit logs with pagination and filters
   */
  async findAll(queryDto: QueryAuditLogDto) {
    const { page, limit, entityType, entityId, action, userId, dateFrom, dateTo, sortBy, sortOrder } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    if (userId) where.userId = userId;

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get audit logs for a specific entity
   */
  async findByEntity(entityType: string, entityId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return logs;
  }

  /**
   * Get audit logs for a specific user
   */
  async findByUser(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where: { userId } }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get recent audit logs
   */
  async findRecent(limit: number = 50) {
    const logs = await this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return logs;
  }

  /**
   * Get audit log statistics
   */
  async getStatistics(dateFrom?: string, dateTo?: string) {
    const where: any = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [
      totalLogs,
      logsByAction,
      logsByEntityType,
      uniqueUsers,
    ] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        where,
        _count: true,
      }),
      this.prisma.auditLog.findMany({
        where,
        distinct: ['userId'],
        select: { userId: true },
      }),
    ]);

    return {
      totalLogs,
      byAction: logsByAction.reduce((acc, item) => {
        acc[item.action] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byEntityType: logsByEntityType.reduce((acc, item) => {
        acc[item.entityType] = item._count;
        return acc;
      }, {} as Record<string, number>),
      uniqueUsers: uniqueUsers.length,
    };
  }

  /**
   * Helper method to log entity changes
   * This can be called from other services
   */
  async logChange(
    entityType: string,
    entityId: string,
    action: 'create' | 'update' | 'delete',
    userId: string | undefined,
    before: any | null,
    after: any | null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const changes: any = {};

    if (action === 'create') {
      changes.after = after;
    } else if (action === 'delete') {
      changes.before = before;
    } else if (action === 'update') {
      changes.before = before;
      changes.after = after;
    }

    return this.create({
      entityType,
      entityId,
      action,
      userId,
      changes,
      ipAddress,
      userAgent,
    });
  }
}
