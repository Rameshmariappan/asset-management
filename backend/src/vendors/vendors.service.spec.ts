import { Test, TestingModule } from '@nestjs/testing';
import { VendorsService } from './vendors.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('VendorsService', () => {
  let service: VendorsService;

  const mockPrisma = {
    vendor: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    asset: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto = { name: 'Dell Inc', code: 'DELL', contactEmail: 'sales@dell.com' };

    it('should create a vendor successfully', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      mockPrisma.vendor.create.mockResolvedValue({ id: '1', ...dto });

      const result = await service.create(dto);

      expect(result).toEqual({ id: '1', ...dto });
      expect(mockPrisma.vendor.create).toHaveBeenCalledWith({ data: dto });
    });

    it('should throw ConflictException if code already exists', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue({ id: '2', code: 'DELL' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all vendors with asset count', async () => {
      const vendors = [{ id: '1', name: 'Dell', _count: { assets: 10 } }];
      mockPrisma.vendor.findMany.mockResolvedValue(vendors);

      const result = await service.findAll();

      expect(result).toEqual(vendors);
      expect(mockPrisma.vendor.findMany).toHaveBeenCalledWith({
        include: { _count: { select: { assets: true } } },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a vendor with assets', async () => {
      const vendor = { id: '1', name: 'Dell', assets: [] };
      mockPrisma.vendor.findUnique.mockResolvedValue(vendor);

      const result = await service.findOne('1');

      expect(result).toEqual(vendor);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(null);

      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const existing = { id: '1', name: 'Dell', code: 'DELL' };

    it('should update successfully', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(existing);
      mockPrisma.vendor.update.mockResolvedValue({ ...existing, name: 'Dell Technologies' });

      const result = await service.update('1', { name: 'Dell Technologies' });

      expect(result.name).toBe('Dell Technologies');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(null);

      await expect(service.update('x', { name: 'Y' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate code', async () => {
      mockPrisma.vendor.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ id: '2', code: 'HP' });

      await expect(service.update('1', { code: 'HP' })).rejects.toThrow(ConflictException);
    });

    it('should skip code check when code unchanged', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(existing);
      mockPrisma.vendor.update.mockResolvedValue(existing);

      await service.update('1', { code: 'DELL' });

      expect(mockPrisma.vendor.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    const existing = { id: '1', name: 'Dell', code: 'DELL' };

    it('should delete successfully', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(existing);
      mockPrisma.asset.count.mockResolvedValue(0);
      mockPrisma.vendor.delete.mockResolvedValue(existing);

      const result = await service.remove('1');

      expect(result).toEqual({ message: 'Vendor deleted successfully' });
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(null);

      await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when has assets', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(existing);
      mockPrisma.asset.count.mockResolvedValue(10);

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });
  });
});
