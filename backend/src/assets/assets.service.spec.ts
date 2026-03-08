import { Test, TestingModule } from '@nestjs/testing';
import { AssetsService } from './assets.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('AssetsService', () => {
  let service: AssetsService;
  let prisma: any;

  const mockPrisma = {
    asset: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    assetAssignment: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    assetTransfer: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      assetTag: 'AST-001',
      name: 'MacBook Pro',
      categoryId: 'cat-1',
      purchaseCost: 2000,
      purchaseDate: '2024-01-01',
    };

    it('should throw ConflictException if asset tag exists', async () => {
      prisma.asset.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createDto as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if serial number exists', async () => {
      prisma.asset.findUnique
        .mockResolvedValueOnce(null) // assetTag check
        .mockResolvedValueOnce({ id: 'existing' }); // serialNumber check

      await expect(
        service.create({ ...createDto, serialNumber: 'SN-001' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should create asset without depreciation when category has no rate', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        depreciationRate: null,
        usefulLifeYears: null,
      });
      prisma.asset.create.mockResolvedValue({
        id: 'asset-1',
        ...createDto,
        currentValue: 2000,
      });

      const result = await service.create(createDto as any);

      expect(result.currentValue).toBe(2000);
    });

    it('should calculate depreciation when category has rate', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        depreciationRate: 20, // 20% per year
        usefulLifeYears: 5,
      });

      // Purchase date 2 years ago
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const dto = {
        ...createDto,
        purchaseDate: twoYearsAgo.toISOString(),
        purchaseCost: 1000,
        salvageValue: 100,
      };

      prisma.asset.create.mockImplementation(({ data }) => ({
        id: 'asset-1',
        ...data,
      }));

      const result = await service.create(dto as any);

      // After 2 years at 20%: 1000 - (1000 * 0.20 * 2) = 600
      expect(result.currentValue).toBeLessThan(1000);
      expect(result.currentValue).toBeGreaterThanOrEqual(100); // Not below salvage
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if asset not found', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for soft-deleted asset', async () => {
      prisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        deletedAt: new Date(),
      });

      await expect(service.findOne('asset-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return asset with relations', async () => {
      const mockAsset = {
        id: 'asset-1',
        name: 'Laptop',
        deletedAt: null,
        category: { id: 'cat-1' },
        vendor: { id: 'vendor-1' },
        location: { id: 'loc-1' },
        assignments: [],
      };
      prisma.asset.findUnique.mockResolvedValue(mockAsset);

      const result = await service.findOne('asset-1');

      expect(result.id).toBe('asset-1');
      expect(result.category).toBeDefined();
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if asset not found', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { name: 'Updated' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new asset tag already exists', async () => {
      prisma.asset.findUnique
        .mockResolvedValueOnce({ id: 'asset-1', assetTag: 'AST-001', deletedAt: null }) // existing
        .mockResolvedValueOnce({ id: 'asset-2', assetTag: 'AST-002' }); // tag conflict

      await expect(
        service.update('asset-1', { assetTag: 'AST-002' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating with same asset tag', async () => {
      prisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        assetTag: 'AST-001',
        deletedAt: null,
      });
      prisma.asset.update.mockResolvedValue({
        id: 'asset-1',
        name: 'Updated',
      });

      const result = await service.update('asset-1', {
        assetTag: 'AST-001',
        name: 'Updated',
      } as any);

      expect(result.name).toBe('Updated');
    });
  });

  describe('remove (soft delete)', () => {
    it('should throw NotFoundException if asset not found', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if asset has active assignments', async () => {
      prisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        deletedAt: null,
        assignments: [{ id: 'assign-1', isActive: true }],
      });

      await expect(service.remove('asset-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should soft-delete asset and set status to retired', async () => {
      prisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        deletedAt: null,
        assignments: [],
      });
      prisma.asset.update.mockResolvedValue({});

      const result = await service.remove('asset-1');

      expect(result.message).toContain('deleted successfully');
      expect(prisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
            status: 'retired',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated assets', async () => {
      const queryDto = { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' as const };
      prisma.asset.count.mockResolvedValue(1);
      prisma.asset.findMany.mockResolvedValue([{ id: 'a1' }]);

      const result = await service.findAll(queryDto);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should apply search filter', async () => {
      const queryDto = { page: 1, limit: 10, search: 'laptop', sortBy: 'createdAt', sortOrder: 'desc' as const };
      prisma.asset.count.mockResolvedValue(0);
      prisma.asset.findMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(prisma.asset.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
      );
    });

    it('should apply categoryId filter', async () => {
      prisma.asset.count.mockResolvedValue(0);
      prisma.asset.findMany.mockResolvedValue([]);

      await service.findAll({ page: 1, limit: 10, categoryId: 'cat-1', sortBy: 'createdAt', sortOrder: 'desc' as const });

      expect(prisma.asset.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ categoryId: 'cat-1' }) }),
      );
    });

    it('should apply vendorId filter', async () => {
      prisma.asset.count.mockResolvedValue(0);
      prisma.asset.findMany.mockResolvedValue([]);

      await service.findAll({ page: 1, limit: 10, vendorId: 'v-1', sortBy: 'createdAt', sortOrder: 'desc' as const });

      expect(prisma.asset.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ vendorId: 'v-1' }) }),
      );
    });

    it('should apply locationId filter', async () => {
      prisma.asset.count.mockResolvedValue(0);
      prisma.asset.findMany.mockResolvedValue([]);

      await service.findAll({ page: 1, limit: 10, locationId: 'loc-1', sortBy: 'createdAt', sortOrder: 'desc' as const });

      expect(prisma.asset.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ locationId: 'loc-1' }) }),
      );
    });

    it('should apply status filter', async () => {
      prisma.asset.count.mockResolvedValue(0);
      prisma.asset.findMany.mockResolvedValue([]);

      await service.findAll({ page: 1, limit: 10, status: 'available', sortBy: 'createdAt', sortOrder: 'desc' as const });

      expect(prisma.asset.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'available' }) }),
      );
    });

    it('should apply purchase date range filter', async () => {
      prisma.asset.count.mockResolvedValue(0);
      prisma.asset.findMany.mockResolvedValue([]);

      await service.findAll({
        page: 1, limit: 10,
        purchaseDateFrom: '2024-01-01', purchaseDateTo: '2024-12-31',
        sortBy: 'createdAt', sortOrder: 'desc' as const,
      });

      expect(prisma.asset.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            purchaseDate: { gte: expect.any(Date), lte: expect.any(Date) },
          }),
        }),
      );
    });

    it('should apply warrantyExpiringInDays filter', async () => {
      prisma.asset.count.mockResolvedValue(0);
      prisma.asset.findMany.mockResolvedValue([]);

      await service.findAll({
        page: 1, limit: 10,
        warrantyExpiringInDays: 30,
        sortBy: 'createdAt', sortOrder: 'desc' as const,
      });

      expect(prisma.asset.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            warrantyEndDate: { gte: expect.any(Date), lte: expect.any(Date) },
          }),
        }),
      );
    });
  });

  describe('create - category not found', () => {
    it('should throw NotFoundException if category not found', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.create({
        assetTag: 'AST-999', name: 'Test', categoryId: 'bad-cat',
        purchaseCost: 100, purchaseDate: '2024-01-01',
      } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update - serial number conflict', () => {
    it('should throw ConflictException if new serial number exists', async () => {
      prisma.asset.findUnique
        .mockResolvedValueOnce({ id: 'a1', assetTag: 'AST-001', serialNumber: 'SN-001', deletedAt: null })
        .mockResolvedValueOnce({ id: 'a2', serialNumber: 'SN-002' }); // serial conflict

      await expect(
        service.update('a1', { serialNumber: 'SN-002' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getAssetHistory', () => {
    it('should return assignments and transfers history', async () => {
      prisma.asset.findUnique.mockResolvedValue({ id: 'a1', assetTag: 'AST-001', name: 'Laptop', deletedAt: null });
      prisma.assetAssignment.findMany.mockResolvedValue([{ id: 'assign-1' }]);
      prisma.assetTransfer.findMany.mockResolvedValue([{ id: 'transfer-1' }]);

      const result = await service.getAssetHistory('a1');

      expect(result.asset.assetTag).toBe('AST-001');
      expect(result.assignments).toHaveLength(1);
      expect(result.transfers).toHaveLength(1);
    });

    it('should throw NotFoundException when asset not found', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);

      await expect(service.getAssetHistory('x')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for soft-deleted asset', async () => {
      prisma.asset.findUnique.mockResolvedValue({ id: 'a1', deletedAt: new Date() });

      await expect(service.getAssetHistory('a1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should throw NotFoundException if asset not found', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('missing', 'available' as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when marking as assigned without active assignment', async () => {
      prisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        deletedAt: null,
      });
      prisma.assetAssignment.count.mockResolvedValue(0);

      await expect(
        service.updateStatus('asset-1', 'assigned' as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update status successfully for non-assigned status', async () => {
      prisma.asset.findUnique.mockResolvedValue({ id: 'asset-1', deletedAt: null });
      prisma.asset.update.mockResolvedValue({ id: 'asset-1', status: 'maintenance' });

      const result = await service.updateStatus('asset-1', 'maintenance' as any);

      expect(result.status).toBe('maintenance');
    });

    it('should allow marking as assigned when active assignment exists', async () => {
      prisma.asset.findUnique.mockResolvedValue({ id: 'asset-1', deletedAt: null });
      prisma.assetAssignment.count.mockResolvedValue(1);
      prisma.asset.update.mockResolvedValue({ id: 'asset-1', status: 'assigned' });

      const result = await service.updateStatus('asset-1', 'assigned' as any);

      expect(result.status).toBe('assigned');
    });
  });

  describe('getStatistics', () => {
    it('should return aggregated statistics', async () => {
      prisma.asset.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(40) // available
        .mockResolvedValueOnce(35) // assigned
        .mockResolvedValueOnce(10) // maintenance
        .mockResolvedValueOnce(5) // damaged
        .mockResolvedValueOnce(10) // retired
        .mockResolvedValueOnce(3); // warranty expiring
      prisma.asset.aggregate.mockResolvedValue({
        _sum: { currentValue: 500000 },
      });

      const result = await service.getStatistics();

      expect(result.total).toBe(100);
      expect(result.byStatus.available).toBe(40);
      expect(result.byStatus.assigned).toBe(35);
      expect(result.totalValue).toBe(500000);
      expect(result.warrantyExpiring30Days).toBe(3);
    });
  });
});
