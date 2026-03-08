import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockPrisma = {
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    asset: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto = { name: 'Electronics', code: 'ELEC', description: 'Electronic devices' };

    it('should create a category successfully', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue({ id: '1', ...dto, parent: null });

      const result = await service.create(dto);

      expect(result).toEqual({ id: '1', ...dto, parent: null });
      expect(mockPrisma.category.create).toHaveBeenCalledWith({
        data: dto,
        include: { parent: true },
      });
    });

    it('should throw ConflictException if code already exists', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: '2', code: 'ELEC' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all categories ordered by name', async () => {
      const categories = [
        { id: '1', name: 'A', parent: null, _count: { assets: 2, children: 0 } },
        { id: '2', name: 'B', parent: null, _count: { assets: 0, children: 1 } },
      ];
      mockPrisma.category.findMany.mockResolvedValue(categories);

      const result = await service.findAll();

      expect(result).toEqual(categories);
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        include: {
          parent: true,
          _count: { select: { assets: true, children: true } },
        },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a category with relations', async () => {
      const category = { id: '1', name: 'Electronics', parent: null, children: [], assets: [] };
      mockPrisma.category.findUnique.mockResolvedValue(category);

      const result = await service.findOne('1');

      expect(result).toEqual(category);
    });

    it('should throw NotFoundException when category not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const existing = { id: '1', name: 'Electronics', code: 'ELEC' };

    it('should update a category successfully', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(existing);
      mockPrisma.category.update.mockResolvedValue({ ...existing, name: 'Updated', parent: null });

      const result = await service.update('1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException when category not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when setting self as parent', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(existing);

      await expect(service.update('1', { parentId: '1' })).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when updating to existing code', async () => {
      mockPrisma.category.findUnique
        .mockResolvedValueOnce(existing) // find existing
        .mockResolvedValueOnce({ id: '2', code: 'FURN' }); // code conflict

      await expect(service.update('1', { code: 'FURN' })).rejects.toThrow(ConflictException);
    });

    it('should skip code uniqueness check when code unchanged', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(existing);
      mockPrisma.category.update.mockResolvedValue({ ...existing, parent: null });

      await service.update('1', { code: 'ELEC' });

      // findUnique called only once (for existence check), not twice
      expect(mockPrisma.category.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    const existing = { id: '1', name: 'Electronics', code: 'ELEC' };

    it('should delete a category successfully', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(existing);
      mockPrisma.asset.count.mockResolvedValue(0);
      mockPrisma.category.count.mockResolvedValue(0);
      mockPrisma.category.delete.mockResolvedValue(existing);

      const result = await service.remove('1');

      expect(result).toEqual({ message: 'Category deleted successfully' });
    });

    it('should throw NotFoundException when category not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when category has assets', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(existing);
      mockPrisma.asset.count.mockResolvedValue(5);
      mockPrisma.category.count.mockResolvedValue(0);

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when category has children', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(existing);
      mockPrisma.asset.count.mockResolvedValue(0);
      mockPrisma.category.count.mockResolvedValue(2);

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });
  });
});
