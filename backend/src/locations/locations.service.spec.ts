import { Test, TestingModule } from '@nestjs/testing';
import { LocationsService } from './locations.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('LocationsService', () => {
  let service: LocationsService;

  const mockPrisma = {
    location: {
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
        LocationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto = { name: 'HQ Building', code: 'HQ-1', address: '123 Main St' };

    it('should create a location successfully', async () => {
      mockPrisma.location.findUnique.mockResolvedValue(null);
      mockPrisma.location.create.mockResolvedValue({ id: '1', ...dto, parent: null });

      const result = await service.create(dto);

      expect(result).toEqual({ id: '1', ...dto, parent: null });
    });

    it('should throw ConflictException if code already exists', async () => {
      mockPrisma.location.findUnique.mockResolvedValue({ id: '2', code: 'HQ-1' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all locations ordered by name', async () => {
      const locations = [{ id: '1', name: 'A', parent: null, _count: { assets: 1, children: 0 } }];
      mockPrisma.location.findMany.mockResolvedValue(locations);

      const result = await service.findAll();

      expect(result).toEqual(locations);
      expect(mockPrisma.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a location with relations', async () => {
      const location = { id: '1', name: 'HQ', parent: null, children: [], assets: [] };
      mockPrisma.location.findUnique.mockResolvedValue(location);

      const result = await service.findOne('1');

      expect(result).toEqual(location);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.location.findUnique.mockResolvedValue(null);

      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const existing = { id: '1', name: 'HQ', code: 'HQ-1' };

    it('should update successfully', async () => {
      mockPrisma.location.findUnique.mockResolvedValue(existing);
      mockPrisma.location.update.mockResolvedValue({ ...existing, name: 'Headquarters', parent: null });

      const result = await service.update('1', { name: 'Headquarters' });

      expect(result.name).toBe('Headquarters');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.location.findUnique.mockResolvedValue(null);

      await expect(service.update('x', { name: 'Y' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for self-parent', async () => {
      mockPrisma.location.findUnique.mockResolvedValue(existing);

      await expect(service.update('1', { parentId: '1' })).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for duplicate code', async () => {
      mockPrisma.location.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ id: '2', code: 'WH-1' });

      await expect(service.update('1', { code: 'WH-1' })).rejects.toThrow(ConflictException);
    });

    it('should skip code check when code unchanged', async () => {
      mockPrisma.location.findUnique.mockResolvedValue(existing);
      mockPrisma.location.update.mockResolvedValue({ ...existing, parent: null });

      await service.update('1', { code: 'HQ-1' });

      expect(mockPrisma.location.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    const existing = { id: '1', name: 'HQ', code: 'HQ-1' };

    it('should delete successfully', async () => {
      mockPrisma.location.findUnique.mockResolvedValue(existing);
      mockPrisma.asset.count.mockResolvedValue(0);
      mockPrisma.location.count.mockResolvedValue(0);
      mockPrisma.location.delete.mockResolvedValue(existing);

      const result = await service.remove('1');

      expect(result).toEqual({ message: 'Location deleted successfully' });
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.location.findUnique.mockResolvedValue(null);

      await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when has assets', async () => {
      mockPrisma.location.findUnique.mockResolvedValue(existing);
      mockPrisma.asset.count.mockResolvedValue(5);
      mockPrisma.location.count.mockResolvedValue(0);

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when has children', async () => {
      mockPrisma.location.findUnique.mockResolvedValue(existing);
      mockPrisma.asset.count.mockResolvedValue(0);
      mockPrisma.location.count.mockResolvedValue(3);

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });
  });
});
