import { Test, TestingModule } from '@nestjs/testing';
import { TransfersService } from './transfers.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

describe('TransfersService', () => {
  let service: TransfersService;
  let prisma: any;

  const mockPrisma = {
    asset: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    assetTransfer: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    assetAssignment: {
      update: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransfersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TransfersService>(TransfersService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      assetId: 'asset-1',
      toUserId: 'user-2',
      transferReason: 'Team change',
    };

    it('should throw NotFoundException if asset not found', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if asset is soft-deleted', async () => {
      prisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        deletedAt: new Date(),
        assignments: [],
      });

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if toUser not found', async () => {
      prisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        deletedAt: null,
        assignments: [],
      });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.assetTransfer.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if pending transfer exists', async () => {
      prisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        deletedAt: null,
        assignments: [],
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2', deletedAt: null });
      prisma.assetTransfer.findFirst.mockResolvedValue({ id: 'existing-transfer' });

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create transfer with pending status', async () => {
      prisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        deletedAt: null,
        assignments: [],
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2', deletedAt: null });
      prisma.assetTransfer.findFirst.mockResolvedValue(null);
      prisma.assetTransfer.create.mockResolvedValue({
        id: 'transfer-1',
        status: 'pending',
        assetId: 'asset-1',
        toUserId: 'user-2',
      });

      const result = await service.create(createDto, 'user-1');

      expect(result.status).toBe('pending');
      expect(prisma.assetTransfer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'pending',
            requestedByUserId: 'user-1',
          }),
        }),
      );
    });
  });

  describe('approveByManager', () => {
    it('should throw NotFoundException if transfer not found', async () => {
      prisma.assetTransfer.findUnique.mockResolvedValue(null);

      await expect(
        service.approveByManager('t-1', { notes: '' }, 'mgr-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not in pending status', async () => {
      prisma.assetTransfer.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'completed',
      });

      await expect(
        service.approveByManager('t-1', { notes: '' }, 'mgr-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update status to manager_approved', async () => {
      prisma.assetTransfer.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'pending',
      });
      prisma.assetTransfer.update.mockResolvedValue({
        id: 't-1',
        status: 'manager_approved',
        managerApproverId: 'mgr-1',
      });

      const result = await service.approveByManager(
        't-1',
        { notes: 'Approved' },
        'mgr-1',
      );

      expect(result.status).toBe('manager_approved');
    });
  });

  describe('approveByAdmin', () => {
    it('should throw NotFoundException if transfer not found', async () => {
      prisma.assetTransfer.findUnique.mockResolvedValue(null);

      await expect(
        service.approveByAdmin('t-1', { notes: '' }, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not manager_approved', async () => {
      prisma.assetTransfer.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'pending',
      });

      await expect(
        service.approveByAdmin('t-1', { notes: '' }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should complete transfer with transaction (deactivate old assignment, create new, update asset)', async () => {
      prisma.assetTransfer.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'manager_approved',
        assetId: 'asset-1',
        toUserId: 'user-2',
        asset: {
          assignments: [{ id: 'assign-1', assignedToUserId: 'user-1' }],
        },
      });

      mockPrisma.assetAssignment.update.mockResolvedValue({});
      mockPrisma.assetAssignment.create.mockResolvedValue({});
      mockPrisma.asset.update.mockResolvedValue({});
      mockPrisma.assetTransfer.update.mockResolvedValue({
        id: 't-1',
        status: 'completed',
        completedAt: new Date(),
      });

      const result = await service.approveByAdmin(
        't-1',
        { notes: 'Done' },
        'admin-1',
      );

      expect(result.status).toBe('completed');
      // Verify old assignment was deactivated
      expect(mockPrisma.assetAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'assign-1' },
          data: expect.objectContaining({ isActive: false }),
        }),
      );
      // Verify new assignment created for toUser
      expect(mockPrisma.assetAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedToUserId: 'user-2',
            isActive: true,
          }),
        }),
      );
    });
  });

  describe('reject', () => {
    it('should throw NotFoundException if transfer not found', async () => {
      prisma.assetTransfer.findUnique.mockResolvedValue(null);

      await expect(
        service.reject('t-1', { rejectionReason: 'No' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already completed', async () => {
      prisma.assetTransfer.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'completed',
      });

      await expect(
        service.reject('t-1', { rejectionReason: 'No' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if already rejected', async () => {
      prisma.assetTransfer.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'rejected',
      });

      await expect(
        service.reject('t-1', { rejectionReason: 'No' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update status to rejected', async () => {
      prisma.assetTransfer.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'pending',
      });
      prisma.assetTransfer.update.mockResolvedValue({
        id: 't-1',
        status: 'rejected',
        rejectedByUserId: 'user-1',
      });

      const result = await service.reject(
        't-1',
        { rejectionReason: 'Budget constraints' },
        'user-1',
      );

      expect(result.status).toBe('rejected');
    });
  });

  describe('create - fromUserId validation', () => {
    it('should throw NotFoundException when fromUser not found', async () => {
      prisma.asset.findUnique.mockResolvedValue({ id: 'asset-1', deletedAt: null, assignments: [{ assignedToUserId: 'user-1' }] });
      prisma.user.findUnique.mockResolvedValueOnce(null); // fromUser

      await expect(
        service.create({ assetId: 'asset-1', fromUserId: 'bad-user', toUserId: 'user-2', transferReason: 'test' }, 'req-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when asset not assigned to anyone', async () => {
      prisma.asset.findUnique.mockResolvedValue({ id: 'asset-1', deletedAt: null, assignments: [] });
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', deletedAt: null });

      await expect(
        service.create({ assetId: 'asset-1', fromUserId: 'user-1', toUserId: 'user-2', transferReason: 'test' }, 'req-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when asset assigned to different user', async () => {
      prisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1', deletedAt: null,
        assignments: [{ assignedToUserId: 'user-3' }],
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', deletedAt: null });

      await expect(
        service.create({ assetId: 'asset-1', fromUserId: 'user-1', toUserId: 'user-2', transferReason: 'test' }, 'req-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated transfers', async () => {
      const queryDto = { page: 1, limit: 10, sortBy: 'requestedAt', sortOrder: 'desc' as const };
      prisma.assetTransfer.findMany.mockResolvedValue([{ id: 't1' }]);
      prisma.assetTransfer.count.mockResolvedValue(1);

      const result = await service.findAll(queryDto);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should apply filters', async () => {
      const queryDto = {
        page: 1, limit: 10,
        assetId: 'a1', fromUserId: 'u1', toUserId: 'u2',
        requestedByUserId: 'u3', status: 'pending' as any,
        sortBy: 'requestedAt', sortOrder: 'desc' as const,
      };
      prisma.assetTransfer.findMany.mockResolvedValue([]);
      prisma.assetTransfer.count.mockResolvedValue(0);

      await service.findAll(queryDto);

      expect(prisma.assetTransfer.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assetId: 'a1', fromUserId: 'u1', toUserId: 'u2',
            requestedByUserId: 'u3', status: 'pending',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a transfer', async () => {
      const transfer = { id: 't1', status: 'pending', asset: {}, fromUser: {}, toUser: {} };
      prisma.assetTransfer.findUnique.mockResolvedValue(transfer);

      const result = await service.findOne('t1');

      expect(result).toEqual(transfer);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.assetTransfer.findUnique.mockResolvedValue(null);

      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveByAdmin - no existing assignment', () => {
    it('should complete transfer without deactivating assignment when none exists', async () => {
      prisma.assetTransfer.findUnique.mockResolvedValue({
        id: 't-1', status: 'manager_approved',
        assetId: 'asset-1', toUserId: 'user-2',
        asset: { assignments: [] },
      });
      mockPrisma.assetAssignment.create.mockResolvedValue({});
      mockPrisma.asset.update.mockResolvedValue({});
      mockPrisma.assetTransfer.update.mockResolvedValue({ id: 't-1', status: 'completed' });

      const result = await service.approveByAdmin('t-1', { notes: 'Done' }, 'admin-1');

      expect(result.status).toBe('completed');
      expect(mockPrisma.assetAssignment.update).not.toHaveBeenCalled();
    });
  });

  describe('findPendingTransfers', () => {
    it('should return pending and manager_approved transfers', async () => {
      prisma.assetTransfer.findMany.mockResolvedValue([{ id: 't1', status: 'pending' }]);

      const result = await service.findPendingTransfers();

      expect(result).toHaveLength(1);
      expect(prisma.assetTransfer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ['pending', 'manager_approved'] } },
          take: 1000,
        }),
      );
    });
  });

  describe('getStatistics', () => {
    it('should return transfer statistics', async () => {
      prisma.assetTransfer.count
        .mockResolvedValueOnce(50)  // total
        .mockResolvedValueOnce(10)  // pending
        .mockResolvedValueOnce(5)   // manager_approved
        .mockResolvedValueOnce(30)  // completed
        .mockResolvedValueOnce(5);  // rejected

      const result = await service.getStatistics();

      expect(result).toEqual({
        totalTransfers: 50,
        pendingTransfers: 10,
        managerApprovedTransfers: 5,
        completedTransfers: 30,
        rejectedTransfers: 5,
        awaitingAction: 15,
      });
    });
  });

  describe('dual-approval state machine', () => {
    it('should enforce pending → manager_approved → completed flow', async () => {
      // Cannot approve by admin when pending
      prisma.assetTransfer.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'pending',
      });

      await expect(
        service.approveByAdmin('t-1', { notes: '' }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);

      // Cannot approve by manager when already manager_approved
      prisma.assetTransfer.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'manager_approved',
      });

      await expect(
        service.approveByManager('t-1', { notes: '' }, 'mgr-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
