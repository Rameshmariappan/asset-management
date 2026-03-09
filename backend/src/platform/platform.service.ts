import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformService {
  constructor(private prisma: PrismaService) {}

  /**
   * List all organizations (platform admin only)
   */
  async listOrganizations(params?: { search?: string; isActive?: boolean }) {
    const where: any = {};

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { slug: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const organizations = await this.prisma.organization.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Batch-fetch asset counts per org to avoid N+1
    const assetCounts = await this.prisma.asset.groupBy({
      by: ['tenantId'],
      _count: true,
      where: { deletedAt: null },
    });

    const assetCountMap = new Map(
      assetCounts.map((ac) => [ac.tenantId, ac._count]),
    );

    return organizations.map((org) => ({
      ...org,
      _count: {
        ...org._count,
        assets: assetCountMap.get(org.id) || 0,
      },
    }));
  }

  /**
   * Aggregated dashboard stats across ALL organizations
   */
  async getDashboardStats() {
    const [
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      totalAssets,
      assetValueAgg,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.asset.count({ where: { deletedAt: null } }),
      this.prisma.asset.aggregate({
        _sum: { currentValue: true },
        where: { deletedAt: null },
      }),
    ]);

    return {
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      totalAssets,
      totalAssetValue: assetValueAgg._sum.currentValue || 0,
    };
  }

  /**
   * Stats for a single organization
   */
  async getOrganizationStats(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const [userCount, assetCount, assetValueAgg, activeAssignments, departmentCount] =
      await Promise.all([
        this.prisma.user.count({ where: { tenantId: orgId, deletedAt: null } }),
        this.prisma.asset.count({ where: { tenantId: orgId, deletedAt: null } }),
        this.prisma.asset.aggregate({
          _sum: { currentValue: true, purchaseCost: true },
          where: { tenantId: orgId, deletedAt: null },
        }),
        this.prisma.assetAssignment.count({ where: { tenantId: orgId, isActive: true } }),
        this.prisma.department.count({ where: { tenantId: orgId } }),
      ]);

    return {
      userCount,
      assetCount,
      totalAssetValue: assetValueAgg._sum.currentValue || 0,
      totalPurchaseCost: assetValueAgg._sum.purchaseCost || 0,
      activeAssignments,
      departmentCount,
    };
  }

  /**
   * Get organization details by ID
   */
  async getOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  /**
   * Update organization (activate/deactivate, rename, etc.)
   */
  async updateOrganization(id: string, data: { name?: string; isActive?: boolean; logoUrl?: string }) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }
}
