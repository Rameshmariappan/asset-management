import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { QueryAssetDto } from './dto/query-asset.dto';
import { AssetStatus } from '@prisma/client';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new asset
   */
  async create(createAssetDto: CreateAssetDto) {
    // Check if asset tag already exists
    const existing = await this.prisma.asset.findUnique({
      where: { assetTag: createAssetDto.assetTag },
    });

    if (existing) {
      throw new ConflictException('Asset tag already exists');
    }

    // Check if serial number exists (if provided)
    if (createAssetDto.serialNumber) {
      const serialExists = await this.prisma.asset.findUnique({
        where: { serialNumber: createAssetDto.serialNumber },
      });
      if (serialExists) {
        throw new ConflictException('Serial number already exists');
      }
    }

    // Calculate current value based on depreciation if category has depreciation rate
    let currentValue = createAssetDto.purchaseCost;
    const category = await this.prisma.category.findUnique({
      where: { id: createAssetDto.categoryId },
    });

    if (category?.depreciationRate && category?.usefulLifeYears) {
      const purchaseDate = new Date(createAssetDto.purchaseDate);
      const now = new Date();
      const yearsOwned = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      
      if (yearsOwned > 0) {
        const depreciationAmount = createAssetDto.purchaseCost * (Number(category.depreciationRate) / 100) * yearsOwned;
        currentValue = Math.max(
          createAssetDto.purchaseCost - depreciationAmount,
          createAssetDto.salvageValue || 0
        );
      }
    }

    const asset = await this.prisma.asset.create({
      data: {
        ...createAssetDto,
        currentValue,
      },
      include: {
        category: true,
        vendor: true,
        location: true,
      },
    });

    return asset;
  }

  /**
   * Find all assets with pagination and filters
   */
  async findAll(queryDto: QueryAssetDto) {
    const {
      page,
      limit,
      search,
      categoryId,
      vendorId,
      locationId,
      status,
      purchaseDateFrom,
      purchaseDateTo,
      warrantyExpiringInDays,
      sortBy,
      sortOrder,
    } = queryDto;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { assetTag: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (status) {
      where.status = status;
    }

    if (purchaseDateFrom || purchaseDateTo) {
      where.purchaseDate = {};
      if (purchaseDateFrom) {
        where.purchaseDate.gte = new Date(purchaseDateFrom);
      }
      if (purchaseDateTo) {
        where.purchaseDate.lte = new Date(purchaseDateTo);
      }
    }

    if (warrantyExpiringInDays !== undefined) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + warrantyExpiringInDays);
      where.warrantyEndDate = {
        gte: new Date(),
        lte: futureDate,
      };
    }

    // Get total count
    const total = await this.prisma.asset.count({ where });

    // Get assets
    const assets = await this.prisma.asset.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            code: true,
            icon: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
          },
        },
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    return {
      data: assets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find one asset by ID
   */
  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: true,
        location: true,
        assignments: {
          where: {
            isActive: true,
          },
          include: {
            assignedToUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!asset || asset.deletedAt) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  /**
   * Update asset
   */
  async update(id: string, updateAssetDto: UpdateAssetDto) {
    const existing = await this.prisma.asset.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Asset not found');
    }

    // Check asset tag uniqueness if being updated
    if (updateAssetDto.assetTag && updateAssetDto.assetTag !== existing.assetTag) {
      const tagExists = await this.prisma.asset.findUnique({
        where: { assetTag: updateAssetDto.assetTag },
      });
      if (tagExists) {
        throw new ConflictException('Asset tag already exists');
      }
    }

    // Check serial number uniqueness if being updated
    if (updateAssetDto.serialNumber && updateAssetDto.serialNumber !== existing.serialNumber) {
      const serialExists = await this.prisma.asset.findUnique({
        where: { serialNumber: updateAssetDto.serialNumber },
      });
      if (serialExists) {
        throw new ConflictException('Serial number already exists');
      }
    }

    const asset = await this.prisma.asset.update({
      where: { id },
      data: updateAssetDto,
      include: {
        category: true,
        vendor: true,
        location: true,
      },
    });

    return asset;
  }

  /**
   * Soft delete asset
   */
  async remove(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        assignments: {
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!asset || asset.deletedAt) {
      throw new NotFoundException('Asset not found');
    }

    if (asset.assignments.length > 0) {
      throw new BadRequestException('Cannot delete asset with active assignments');
    }

    await this.prisma.asset.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: AssetStatus.retired,
      },
    });

    return { message: 'Asset deleted successfully' };
  }

  /**
   * Get asset history
   */
  async getAssetHistory(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
    });

    if (!asset || asset.deletedAt) {
      throw new NotFoundException('Asset not found');
    }

    const assignments = await this.prisma.assetAssignment.findMany({
      where: { assetId: id },
      include: {
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    const transfers = await this.prisma.assetTransfer.findMany({
      where: { assetId: id },
      include: {
        fromUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        toUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        requestedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    return {
      asset: {
        id: asset.id,
        assetTag: asset.assetTag,
        name: asset.name,
      },
      assignments,
      transfers,
    };
  }

  /**
   * Get asset statistics
   */
  async getStatistics() {
    const [
      totalAssets,
      availableAssets,
      assignedAssets,
      maintenanceAssets,
      damagedAssets,
      retiredAssets,
      totalValue,
      warrantyExpiring30Days,
    ] = await Promise.all([
      this.prisma.asset.count({ where: { deletedAt: null } }),
      this.prisma.asset.count({ where: { status: AssetStatus.available, deletedAt: null } }),
      this.prisma.asset.count({ where: { status: AssetStatus.assigned, deletedAt: null } }),
      this.prisma.asset.count({ where: { status: AssetStatus.maintenance, deletedAt: null } }),
      this.prisma.asset.count({ where: { status: AssetStatus.damaged, deletedAt: null } }),
      this.prisma.asset.count({ where: { status: AssetStatus.retired, deletedAt: null } }),
      this.prisma.asset.aggregate({
        where: { deletedAt: null },
        _sum: {
          currentValue: true,
        },
      }),
      this.prisma.asset.count({
        where: {
          deletedAt: null,
          warrantyEndDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      total: totalAssets,
      byStatus: {
        available: availableAssets,
        assigned: assignedAssets,
        maintenance: maintenanceAssets,
        damaged: damagedAssets,
        retired: retiredAssets,
      },
      totalValue: totalValue._sum.currentValue || 0,
      warrantyExpiring30Days,
    };
  }

  /**
   * Update asset status
   */
  async updateStatus(id: string, status: AssetStatus) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
    });

    if (!asset || asset.deletedAt) {
      throw new NotFoundException('Asset not found');
    }

    // Validate status transitions
    if (status === AssetStatus.assigned) {
      const activeAssignments = await this.prisma.assetAssignment.count({
        where: {
          assetId: id,
          isActive: true,
        },
      });
      if (activeAssignments === 0) {
        throw new BadRequestException('Cannot mark as assigned without active assignment');
      }
    }

    return this.prisma.asset.update({
      where: { id },
      data: { status },
      include: {
        category: true,
        vendor: true,
        location: true,
      },
    });
  }
}
