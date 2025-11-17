import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { ApproveTransferDto } from './dto/approve-transfer.dto';
import { RejectTransferDto } from './dto/reject-transfer.dto';
import { QueryTransferDto } from './dto/query-transfer.dto';
import { TransferStatus, AssetStatus } from '@prisma/client';

@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Request a new asset transfer
   */
  async create(createDto: CreateTransferDto, requestedByUserId: string) {
    // Validate asset exists
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

    // Validate fromUser if provided
    if (createDto.fromUserId) {
      const fromUser = await this.prisma.user.findUnique({
        where: { id: createDto.fromUserId },
      });
      if (!fromUser || fromUser.deletedAt) {
        throw new NotFoundException('From user not found');
      }

      // Verify asset is currently assigned to fromUser
      if (asset.assignments.length > 0 && asset.assignments[0].assignedToUserId !== createDto.fromUserId) {
        throw new BadRequestException(
          'Asset is not currently assigned to the specified from user',
        );
      }
    }

    // Validate toUser exists
    const toUser = await this.prisma.user.findUnique({
      where: { id: createDto.toUserId },
    });

    if (!toUser || toUser.deletedAt) {
      throw new NotFoundException('To user not found');
    }

    // Check for pending transfers for this asset
    const pendingTransfer = await this.prisma.assetTransfer.findFirst({
      where: {
        assetId: createDto.assetId,
        status: {
          in: [TransferStatus.pending, TransferStatus.manager_approved],
        },
      },
    });

    if (pendingTransfer) {
      throw new BadRequestException(
        'There is already a pending transfer request for this asset',
      );
    }

    // Create transfer request
    const transfer = await this.prisma.assetTransfer.create({
      data: {
        assetId: createDto.assetId,
        fromUserId: createDto.fromUserId,
        toUserId: createDto.toUserId,
        requestedByUserId,
        transferReason: createDto.transferReason,
        status: TransferStatus.pending,
      },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            serialNumber: true,
          },
        },
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
    });

    return transfer;
  }

  /**
   * Get all transfers with pagination and filters
   */
  async findAll(queryDto: QueryTransferDto) {
    const { page, limit, assetId, fromUserId, toUserId, requestedByUserId, status, sortBy, sortOrder } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (assetId) where.assetId = assetId;
    if (fromUserId) where.fromUserId = fromUserId;
    if (toUserId) where.toUserId = toUserId;
    if (requestedByUserId) where.requestedByUserId = requestedByUserId;
    if (status) where.status = status;

    const [transfers, total] = await Promise.all([
      this.prisma.assetTransfer.findMany({
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
          fromUser: {
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
          toUser: {
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
          requestedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          managerApprover: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          adminApprover: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          rejectedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.assetTransfer.count({ where }),
    ]);

    return {
      data: transfers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single transfer by ID
   */
  async findOne(id: string) {
    const transfer = await this.prisma.assetTransfer.findUnique({
      where: { id },
      include: {
        asset: true,
        fromUser: {
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
        toUser: {
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
        requestedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        managerApprover: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        adminApprover: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        rejectedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return transfer;
  }

  /**
   * Manager approval (first level)
   */
  async approveByManager(id: string, approveDto: ApproveTransferDto, managerId: string) {
    const transfer = await this.prisma.assetTransfer.findUnique({
      where: { id },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status !== TransferStatus.pending) {
      throw new BadRequestException(
        `Cannot approve transfer with status: ${transfer.status}`,
      );
    }

    const updatedTransfer = await this.prisma.assetTransfer.update({
      where: { id },
      data: {
        status: TransferStatus.manager_approved,
        managerApproverId: managerId,
        managerApprovedAt: new Date(),
        managerNotes: approveDto.notes,
      },
      include: {
        asset: true,
        fromUser: true,
        toUser: true,
        requestedByUser: true,
        managerApprover: true,
      },
    });

    return updatedTransfer;
  }

  /**
   * Admin approval (second level) - completes the transfer
   */
  async approveByAdmin(id: string, approveDto: ApproveTransferDto, adminId: string) {
    const transfer = await this.prisma.assetTransfer.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            assignments: {
              where: { isActive: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status !== TransferStatus.manager_approved) {
      throw new BadRequestException(
        `Transfer must be manager approved first. Current status: ${transfer.status}`,
      );
    }

    // Execute transfer in a transaction
    const updatedTransfer = await this.prisma.$transaction(async (prisma) => {
      // Return current assignment if active
      if (transfer.asset.assignments.length > 0) {
        const currentAssignment = transfer.asset.assignments[0];
        await prisma.assetAssignment.update({
          where: { id: currentAssignment.id },
          data: {
            isActive: false,
            returnedAt: new Date(),
            returnedToUserId: adminId,
          },
        });
      }

      // Create new assignment for toUser
      await prisma.assetAssignment.create({
        data: {
          assetId: transfer.assetId,
          assignedToUserId: transfer.toUserId,
          assignedByUserId: adminId,
          assignedAt: new Date(),
          assignCondition: 'Good', // Default condition for transfers
          assignConditionRating: 4,
          assignNotes: `Transferred via request ${id}`,
          isActive: true,
        },
      });

      // Update asset status
      await prisma.asset.update({
        where: { id: transfer.assetId },
        data: { status: AssetStatus.assigned },
      });

      // Update transfer status
      const updated = await prisma.assetTransfer.update({
        where: { id },
        data: {
          status: TransferStatus.completed,
          adminApproverId: adminId,
          adminApprovedAt: new Date(),
          adminNotes: approveDto.notes,
          completedAt: new Date(),
        },
        include: {
          asset: true,
          fromUser: true,
          toUser: true,
          requestedByUser: true,
          managerApprover: true,
          adminApprover: true,
        },
      });

      return updated;
    });

    return updatedTransfer;
  }

  /**
   * Reject a transfer request
   */
  async reject(id: string, rejectDto: RejectTransferDto, rejectedByUserId: string) {
    const transfer = await this.prisma.assetTransfer.findUnique({
      where: { id },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status === TransferStatus.completed) {
      throw new BadRequestException('Cannot reject a completed transfer');
    }

    if (transfer.status === TransferStatus.rejected) {
      throw new BadRequestException('Transfer is already rejected');
    }

    const updatedTransfer = await this.prisma.assetTransfer.update({
      where: { id },
      data: {
        status: TransferStatus.rejected,
        rejectedByUserId,
        rejectedAt: new Date(),
        rejectionReason: rejectDto.rejectionReason,
      },
      include: {
        asset: true,
        fromUser: true,
        toUser: true,
        requestedByUser: true,
        managerApprover: true,
        adminApprover: true,
        rejectedByUser: true,
      },
    });

    return updatedTransfer;
  }

  /**
   * Get pending transfers (requiring approval)
   */
  async findPendingTransfers() {
    const transfers = await this.prisma.assetTransfer.findMany({
      where: {
        status: {
          in: [TransferStatus.pending, TransferStatus.manager_approved],
        },
      },
      orderBy: { requestedAt: 'asc' },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            serialNumber: true,
          },
        },
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
    });

    return transfers;
  }

  /**
   * Get transfer statistics
   */
  async getStatistics() {
    const [
      totalTransfers,
      pendingTransfers,
      managerApprovedTransfers,
      completedTransfers,
      rejectedTransfers,
    ] = await Promise.all([
      this.prisma.assetTransfer.count(),
      this.prisma.assetTransfer.count({ where: { status: TransferStatus.pending } }),
      this.prisma.assetTransfer.count({ where: { status: TransferStatus.manager_approved } }),
      this.prisma.assetTransfer.count({ where: { status: TransferStatus.completed } }),
      this.prisma.assetTransfer.count({ where: { status: TransferStatus.rejected } }),
    ]);

    return {
      totalTransfers,
      pendingTransfers,
      managerApprovedTransfers,
      completedTransfers,
      rejectedTransfers,
      awaitingAction: pendingTransfers + managerApprovedTransfers,
    };
  }
}
