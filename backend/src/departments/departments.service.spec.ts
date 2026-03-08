import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentsService } from './departments.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('DepartmentsService', () => {
  let service: DepartmentsService;

  const mockPrisma = {
    department: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DepartmentsService>(DepartmentsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto = { name: 'Engineering', code: 'ENG' };

    it('should create a department successfully', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);
      const created = { id: '1', ...dto, parent: null, headUser: null };
      mockPrisma.department.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(result).toEqual(created);
      expect(mockPrisma.department.create).toHaveBeenCalledWith({
        data: dto,
        include: {
          parent: true,
          headUser: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });
    });

    it('should throw ConflictException if code already exists', async () => {
      mockPrisma.department.findUnique.mockResolvedValue({ id: '2', code: 'ENG' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all departments', async () => {
      const departments = [{ id: '1', name: 'Eng', parent: null, headUser: null, _count: { users: 5, children: 0 } }];
      mockPrisma.department.findMany.mockResolvedValue(departments);

      const result = await service.findAll();

      expect(result).toEqual(departments);
      expect(mockPrisma.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a department with relations', async () => {
      const dept = { id: '1', name: 'Eng', parent: null, children: [], headUser: null, users: [] };
      mockPrisma.department.findUnique.mockResolvedValue(dept);

      const result = await service.findOne('1');

      expect(result).toEqual(dept);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);

      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const existing = { id: '1', name: 'Eng', code: 'ENG' };

    it('should update successfully', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(existing);
      mockPrisma.department.update.mockResolvedValue({ ...existing, name: 'Engineering', parent: null, headUser: null });

      const result = await service.update('1', { name: 'Engineering' });

      expect(result.name).toBe('Engineering');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);

      await expect(service.update('x', { name: 'Y' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for self-parent', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(existing);

      await expect(service.update('1', { parentId: '1' })).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for duplicate code', async () => {
      mockPrisma.department.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ id: '2', code: 'HR' });

      await expect(service.update('1', { code: 'HR' })).rejects.toThrow(ConflictException);
    });

    it('should skip code check when code unchanged', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(existing);
      mockPrisma.department.update.mockResolvedValue({ ...existing, parent: null, headUser: null });

      await service.update('1', { code: 'ENG' });

      expect(mockPrisma.department.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    const existing = { id: '1', name: 'Eng', code: 'ENG' };

    it('should delete successfully', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(existing);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.department.count.mockResolvedValue(0);
      mockPrisma.department.delete.mockResolvedValue(existing);

      const result = await service.remove('1');

      expect(result).toEqual({ message: 'Department deleted successfully' });
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);

      await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when has users', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(existing);
      mockPrisma.user.count.mockResolvedValue(3);
      mockPrisma.department.count.mockResolvedValue(0);

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when has children', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(existing);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.department.count.mockResolvedValue(2);

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });
  });
});
