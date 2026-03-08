import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsService } from './assignments.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

describe('AssignmentsService', () => {
  let service: AssignmentsService;

  const mockPrisma = {
    asset: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    assetAssignment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      assetId: 'asset-1',
      assignedToUserId: 'user-1',
      assignCondition: 'Good' as any,
      assignConditionRating: 4,
    };

    it('should create an assignment successfully', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        status: 'available',
        deletedAt: null,
        assignments: [],
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', deletedAt: null });
      const created = { id: 'assign-1', ...createDto, asset: {}, assignedToUser: {}, assignedByUser: {} };
      mockPrisma.assetAssignment.create.mockResolvedValue(created);
      mockPrisma.asset.update.mockResolvedValue({});

      const result = await service.create(createDto, 'admin-1');

      expect(result.id).toBe('assign-1');
    });

    it('should hash signature when provided', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        status: 'available',
        deletedAt: null,
        assignments: [],
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', deletedAt: null });
      mockPrisma.assetAssignment.create.mockResolvedValue({ id: 'a1' });
      mockPrisma.asset.update.mockResolvedValue({});

      await service.create({ ...createDto, assignSignature: 'sig-data' }, 'admin-1');

      expect(mockPrisma.assetAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignSignatureHash: expect.any(String),
          }),
        }),
      );
    });

    it('should throw NotFoundException when asset not found', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when asset is soft-deleted', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({ id: 'asset-1', deletedAt: new Date(), status: 'available', assignments: [] });

      await expect(service.create(createDto, 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when asset not available', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        status: 'assigned',
        deletedAt: null,
        assignments: [],
      });

      await expect(service.create(createDto, 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when asset already assigned', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        status: 'available',
        deletedAt: null,
        assignments: [{ id: 'existing' }],
      });

      await expect(service.create(createDto, 'admin-1')).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        status: 'available',
        deletedAt: null,
        assignments: [],
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user is soft-deleted', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        status: 'available',
        deletedAt: null,
        assignments: [],
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', deletedAt: new Date() });

      await expect(service.create(createDto, 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should set expectedReturnDate when provided', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        status: 'available',
        deletedAt: null,
        assignments: [],
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', deletedAt: null });
      mockPrisma.assetAssignment.create.mockResolvedValue({ id: 'a1' });
      mockPrisma.asset.update.mockResolvedValue({});

      await service.create({ ...createDto, expectedReturnDate: '2025-12-31' }, 'admin-1');

      expect(mockPrisma.assetAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expectedReturnDate: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated assignments', async () => {
      const queryDto = { page: 1, limit: 10, sortBy: 'assignedAt', sortOrder: 'desc' as const };
      mockPrisma.assetAssignment.findMany.mockResolvedValue([{ id: 'a1' }]);
      mockPrisma.assetAssignment.count.mockResolvedValue(1);

      const result = await service.findAll(queryDto);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should apply filters', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        assetId: 'asset-1',
        assignedToUserId: 'user-1',
        assignedByUserId: 'admin-1',
        isActive: true,
        sortBy: 'assignedAt',
        sortOrder: 'desc' as const,
      };
      mockPrisma.assetAssignment.findMany.mockResolvedValue([]);
      mockPrisma.assetAssignment.count.mockResolvedValue(0);

      await service.findAll(queryDto);

      expect(mockPrisma.assetAssignment.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assetId: 'asset-1',
            assignedToUserId: 'user-1',
            assignedByUserId: 'admin-1',
            isActive: true,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return an assignment', async () => {
      const assignment = { id: 'a1', asset: {}, assignedToUser: {}, assignedByUser: {}, returnedToUser: null };
      mockPrisma.assetAssignment.findUnique.mockResolvedValue(assignment);

      const result = await service.findOne('a1');

      expect(result).toEqual(assignment);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.assetAssignment.findUnique.mockResolvedValue(null);

      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('returnAsset', () => {
    const returnDto = { returnCondition: 'Good' as any, returnConditionRating: 4, returnPhotoUrls: [] as string[] };

    it('should return an asset successfully', async () => {
      mockPrisma.assetAssignment.findUnique.mockResolvedValue({
        id: 'a1',
        isActive: true,
        assetId: 'asset-1',
        asset: { id: 'asset-1' },
      });
      mockPrisma.assetAssignment.update.mockResolvedValue({ id: 'a1', isActive: false });
      mockPrisma.asset.update.mockResolvedValue({});

      const result = await service.returnAsset('a1', returnDto, 'admin-1');

      expect(result.isActive).toBe(false);
    });

    it('should set asset status to damaged for poor condition', async () => {
      mockPrisma.assetAssignment.findUnique.mockResolvedValue({
        id: 'a1',
        isActive: true,
        assetId: 'asset-1',
        asset: { id: 'asset-1' },
      });
      mockPrisma.assetAssignment.update.mockResolvedValue({ id: 'a1' });
      mockPrisma.asset.update.mockResolvedValue({});

      await service.returnAsset('a1', { returnCondition: 'Damaged' as any, returnConditionRating: 2, returnPhotoUrls: [] }, 'admin-1');

      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'damaged' },
        }),
      );
    });

    it('should set asset status to damaged for Poor condition', async () => {
      mockPrisma.assetAssignment.findUnique.mockResolvedValue({
        id: 'a1',
        isActive: true,
        assetId: 'asset-1',
        asset: { id: 'asset-1' },
      });
      mockPrisma.assetAssignment.update.mockResolvedValue({ id: 'a1' });
      mockPrisma.asset.update.mockResolvedValue({});

      await service.returnAsset('a1', { returnCondition: 'Poor' as any, returnConditionRating: 1, returnPhotoUrls: [] }, 'admin-1');

      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'damaged' },
        }),
      );
    });

    it('should hash return signature when provided', async () => {
      mockPrisma.assetAssignment.findUnique.mockResolvedValue({
        id: 'a1',
        isActive: true,
        assetId: 'asset-1',
        asset: { id: 'asset-1' },
      });
      mockPrisma.assetAssignment.update.mockResolvedValue({ id: 'a1' });
      mockPrisma.asset.update.mockResolvedValue({});

      await service.returnAsset('a1', { ...returnDto, returnSignature: 'sig' }, 'admin-1');

      expect(mockPrisma.assetAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            returnSignatureHash: expect.any(String),
          }),
        }),
      );
    });

    it('should throw NotFoundException when assignment not found', async () => {
      mockPrisma.assetAssignment.findUnique.mockResolvedValue(null);

      await expect(service.returnAsset('x', returnDto, 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when already returned', async () => {
      mockPrisma.assetAssignment.findUnique.mockResolvedValue({
        id: 'a1',
        isActive: false,
        asset: {},
      });

      await expect(service.returnAsset('a1', returnDto, 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findActiveAssignments', () => {
    it('should return active assignments', async () => {
      const assignments = [{ id: 'a1', isActive: true }];
      mockPrisma.assetAssignment.findMany.mockResolvedValue(assignments);

      const result = await service.findActiveAssignments();

      expect(result).toEqual(assignments);
      expect(mockPrisma.assetAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          take: 1000,
        }),
      );
    });
  });

  describe('findUserAssignments', () => {
    it('should return all assignments for a user', async () => {
      mockPrisma.assetAssignment.findMany.mockResolvedValue([{ id: 'a1' }]);

      const result = await service.findUserAssignments('user-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.assetAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assignedToUserId: 'user-1' },
        }),
      );
    });

    it('should filter by isActive when provided', async () => {
      mockPrisma.assetAssignment.findMany.mockResolvedValue([]);

      await service.findUserAssignments('user-1', true);

      expect(mockPrisma.assetAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assignedToUserId: 'user-1', isActive: true },
        }),
      );
    });
  });

  describe('getStatistics', () => {
    it('should return assignment statistics', async () => {
      mockPrisma.assetAssignment.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30)  // active
        .mockResolvedValueOnce(5);  // overdue

      const result = await service.getStatistics();

      expect(result).toEqual({
        totalAssignments: 100,
        activeAssignments: 30,
        returnedAssignments: 70,
        overdueAssignments: 5,
      });
    });
  });
});
