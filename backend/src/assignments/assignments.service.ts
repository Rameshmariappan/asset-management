import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReturnAssignmentDto } from './dto/return-assignment.dto';
import { QueryAssignmentDto } from './dto/query-assignment.dto';
import { AssetStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new asset assignment
   */
  async create(createDto: CreateAssignmentDto, assignedByUserId: string) {
    // Validate asset exists and is available
    const asset = await this.prisma.asset.findUnique({
      where: { id: createDto.assetId },
      include: {
        assignments: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!asset || asset.deletedAt) {
      throw new NotFoundException('Asset not found');
    }

    if (asset.status !== AssetStatus.available) {
      throw new BadRequestException(
        `Asset is not available for assignment. Current status: ${asset.status}`,
      );
    }

    if (asset.assignments.length > 0) {
      throw new ConflictException('Asset is already assigned to another user');
    }

    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: createDto.assignedToUserId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    // Hash signature if provided
    let assignSignatureHash: string | undefined;
    if (createDto.assignSignature) {
      assignSignatureHash = crypto
        .createHash('sha256')
        .update(createDto.assignSignature)
        .digest('hex');
    }

    // Create assignment and update asset status in a transaction
    const assignment = await this.prisma.$transaction(async (prisma) => {
      const newAssignment = await prisma.assetAssignment.create({
        data: {
          assetId: createDto.assetId,
          assignedToUserId: createDto.assignedToUserId,
          assignedByUserId,
          assignedAt: new Date(),
          expectedReturnDate: createDto.expectedReturnDate
            ? new Date(createDto.expectedReturnDate)
            : null,
          assignCondition: createDto.assignCondition,
          assignConditionRating: createDto.assignConditionRating,
          assignNotes: createDto.assignNotes,
          assignSignatureUrl: createDto.assignSignature,
          assignSignatureHash,
          isActive: true,
        },
        include: {
          asset: true,
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
      });

      // Update asset status to assigned
      await prisma.asset.update({
        where: { id: createDto.assetId },
        data: { status: AssetStatus.assigned },
      });

      return newAssignment;
    });

    return assignment;
  }

  /**
   * Get all assignments with pagination and filters
   */
  async findAll(queryDto: QueryAssignmentDto) {
    const { page, limit, assetId, assignedToUserId, assignedByUserId, isActive, sortBy, sortOrder } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (assetId) where.assetId = assetId;
    if (assignedToUserId) where.assignedToUserId = assignedToUserId;
    if (assignedByUserId) where.assignedByUserId = assignedByUserId;
    if (isActive !== undefined) where.isActive = isActive;

    const [assignments, total] = await Promise.all([
      this.prisma.assetAssignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              name: true,
              serialNumber: true,
              status: true,
            },
          },
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
          returnedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.assetAssignment.count({ where }),
    ]);

    return {
      data: assignments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single assignment by ID
   */
  async findOne(id: string) {
    const assignment = await this.prisma.assetAssignment.findUnique({
      where: { id },
      include: {
        asset: true,
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            department: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
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
        returnedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }

  /**
   * Return an asset
   */
  async returnAsset(id: string, returnDto: ReturnAssignmentDto, returnedToUserId: string) {
    const assignment = await this.prisma.assetAssignment.findUnique({
      where: { id },
      include: { asset: true },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (!assignment.isActive) {
      throw new BadRequestException('Assignment is already returned');
    }

    // Hash signature if provided
    let returnSignatureHash: string | undefined;
    if (returnDto.returnSignature) {
      returnSignatureHash = crypto
        .createHash('sha256')
        .update(returnDto.returnSignature)
        .digest('hex');
    }

    // Update assignment and asset status in a transaction
    const updatedAssignment = await this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.assetAssignment.update({
        where: { id },
        data: {
          returnedAt: new Date(),
          returnedToUserId,
          returnCondition: returnDto.returnCondition,
          returnConditionRating: returnDto.returnConditionRating,
          returnPhotoUrls: returnDto.returnPhotoUrls,
          returnNotes: returnDto.returnNotes,
          returnSignatureUrl: returnDto.returnSignature,
          returnSignatureHash,
          isActive: false,
        },
        include: {
          asset: true,
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
          returnedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Determine new asset status based on return condition
      let newStatus = AssetStatus.available;
      if (returnDto.returnCondition === 'Damaged' || returnDto.returnCondition === 'Poor') {
        newStatus = AssetStatus.damaged;
      }

      // Update asset status
      await prisma.asset.update({
        where: { id: assignment.assetId },
        data: { status: newStatus },
      });

      return updated;
    });

    return updatedAssignment;
  }

  /**
   * Get all active assignments
   */
  async findActiveAssignments() {
    const assignments = await this.prisma.assetAssignment.findMany({
      where: { isActive: true },
      orderBy: { assignedAt: 'desc' },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            serialNumber: true,
            status: true,
          },
        },
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
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
    });

    return assignments;
  }

  /**
   * Get assignments for a specific user
   */
  async findUserAssignments(userId: string, isActive?: boolean) {
    const where: any = { assignedToUserId: userId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const assignments = await this.prisma.assetAssignment.findMany({
      where,
      orderBy: { assignedAt: 'desc' },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            serialNumber: true,
            status: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
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
        returnedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return assignments;
  }

  /**
   * Get assignment statistics
   */
  async getStatistics() {
    const [totalAssignments, activeAssignments, overdueAssignments] = await Promise.all([
      this.prisma.assetAssignment.count(),
      this.prisma.assetAssignment.count({ where: { isActive: true } }),
      this.prisma.assetAssignment.count({
        where: {
          isActive: true,
          expectedReturnDate: {
            lt: new Date(),
          },
        },
      }),
    ]);

    return {
      totalAssignments,
      activeAssignments,
      returnedAssignments: totalAssignments - activeAssignments,
      overdueAssignments,
    };
  }
}
