import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    role: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    userRole: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    assetAssignment: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    assetTransfer: {
      count: jest.fn(),
    },
    $transaction: jest.fn((cb) => {
      if (typeof cb === 'function') return cb(mockPrisma);
      return Promise.all(cb);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      email: 'test@test.com',
      password: 'Pass@123',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should create a user with default EMPLOYEE role', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'role-1', name: 'EMPLOYEE' });
      mockPrisma.user.create.mockResolvedValue({ id: 'user-1', ...createDto, passwordHash: 'hashed' });
      mockPrisma.userRole.createMany.mockResolvedValue({ count: 1 });

      // Mock findOne for the return
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        ...createDto,
        passwordHash: 'hashed',
        deletedAt: null,
        department: null,
        manager: null,
        userRoles: [{ role: { id: 'role-1', name: 'EMPLOYEE', displayName: 'Employee', description: '' } }],
        subordinates: [],
      });

      const result = await service.create(createDto);

      expect(result.roles).toEqual([{ id: 'role-1', name: 'EMPLOYEE', displayName: 'Employee', description: '' }]);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should create user with specified roles', async () => {
      const dtoWithRoles = { ...createDto, roleNames: ['ASSET_MANAGER', 'EMPLOYEE'] };
      mockPrisma.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.role.findMany.mockResolvedValue([
        { id: 'r1', name: 'ASSET_MANAGER' },
        { id: 'r2', name: 'EMPLOYEE' },
      ]);
      mockPrisma.user.create.mockResolvedValue({ id: 'user-1' });
      mockPrisma.userRole.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        ...createDto,
        passwordHash: 'hashed',
        deletedAt: null,
        department: null,
        manager: null,
        userRoles: [
          { role: { id: 'r1', name: 'ASSET_MANAGER', displayName: 'Asset Manager', description: '' } },
          { role: { id: 'r2', name: 'EMPLOYEE', displayName: 'Employee', description: '' } },
        ],
        subordinates: [],
      });

      const result = await service.create(dtoWithRoles);

      expect(result.roles).toHaveLength(2);
    });

    it('should throw BadRequestException if specified roles not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.role.findMany.mockResolvedValue([{ id: 'r1', name: 'EMPLOYEE' }]);

      await expect(
        service.create({ ...createDto, roleNames: ['EMPLOYEE', 'NONEXISTENT'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if default EMPLOYEE role not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.role.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const queryDto = { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' as const };
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          email: 'test@test.com',
          passwordHash: 'hash',
          department: null,
          manager: null,
          userRoles: [{ role: { id: 'r1', name: 'EMPLOYEE', displayName: 'Employee' } }],
        },
      ]);

      const result = await service.findAll(queryDto);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0]).not.toHaveProperty('passwordHash');
      expect(result.data[0].roles).toEqual([{ id: 'r1', name: 'EMPLOYEE', displayName: 'Employee' }]);
    });

    it('should apply search filter', async () => {
      const queryDto = { page: 1, limit: 10, search: 'john', sortBy: 'createdAt', sortOrder: 'desc' as const };
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockPrisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should apply departmentId filter', async () => {
      const queryDto = { page: 1, limit: 10, departmentId: 'dept-1', sortBy: 'createdAt', sortOrder: 'desc' as const };
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockPrisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ departmentId: 'dept-1' }),
        }),
      );
    });

    it('should apply isActive filter', async () => {
      const queryDto = { page: 1, limit: 10, isActive: true, sortBy: 'createdAt', sortOrder: 'desc' as const };
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockPrisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('should apply roleId filter', async () => {
      const queryDto = { page: 1, limit: 10, roleId: 'role-1', sortBy: 'createdAt', sortOrder: 'desc' as const };
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockPrisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userRoles: { some: { roleId: 'role-1' } },
          }),
        }),
      );
    });

    it('should calculate totalPages correctly', async () => {
      const queryDto = { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' as const };
      mockPrisma.user.count.mockResolvedValue(25);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.findAll(queryDto);

      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('findOne', () => {
    it('should return user without passwordHash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        passwordHash: 'hash',
        deletedAt: null,
        department: null,
        manager: null,
        userRoles: [{ role: { id: 'r1', name: 'EMPLOYEE', displayName: 'Employee', description: '' } }],
        subordinates: [],
      });

      const result = await service.findOne('u1');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.roles).toBeDefined();
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for soft-deleted user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        deletedAt: new Date(),
      });

      await expect(service.findOne('u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const existingUser = { id: 'u1', email: 'old@test.com', deletedAt: null };

    it('should update user successfully', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(existingUser) // existence check
        .mockResolvedValueOnce({ // findOne return
          ...existingUser,
          email: 'new@test.com',
          passwordHash: 'hash',
          deletedAt: null,
          department: null,
          manager: null,
          userRoles: [],
          subordinates: [],
        });
      mockPrisma.user.update.mockResolvedValue({ ...existingUser, email: 'new@test.com' });
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await service.update('u1', { email: 'new@test.com' });

      expect(result.email).toBe('new@test.com');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.update('x', { firstName: 'Y' })).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for soft-deleted user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', deletedAt: new Date() });

      await expect(service.update('u1', { firstName: 'Y' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u2', email: 'taken@test.com' });

      await expect(service.update('u1', { email: 'taken@test.com' })).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft-delete user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', deletedAt: null });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.remove('u1');

      expect(result).toEqual({ message: 'User deleted successfully' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { deletedAt: expect.any(Date), isActive: false },
      });
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for already deleted user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', deletedAt: new Date() });

      await expect(service.remove('u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignRoles', () => {
    it('should assign roles atomically', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u1', deletedAt: null }) // existence check
        .mockResolvedValueOnce({ // findOne return
          id: 'u1',
          passwordHash: 'hash',
          deletedAt: null,
          department: null,
          manager: null,
          userRoles: [{ role: { id: 'r1', name: 'ADMIN', displayName: 'Admin', description: '' } }],
          subordinates: [],
        });
      mockPrisma.role.findMany.mockResolvedValue([{ id: 'r1', name: 'ADMIN' }]);
      mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.userRole.createMany.mockResolvedValue({ count: 1 });

      const result = await service.assignRoles('u1', { roleNames: ['ADMIN'] });

      expect(result.roles).toBeDefined();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.assignRoles('x', { roleNames: ['ADMIN'] })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if roles not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', deletedAt: null });
      mockPrisma.role.findMany.mockResolvedValue([]);

      await expect(
        service.assignRoles('u1', { roleNames: ['NONEXISTENT'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changePassword', () => {
    const changeDto = { currentPassword: 'Old@123', newPassword: 'New@456' };

    it('should change password successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordHash: 'old-hash',
        deletedAt: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.changePassword('u1', changeDto);

      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.changePassword('x', changeDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for SSO user without password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordHash: null,
        deletedAt: null,
      });

      await expect(service.changePassword('u1', changeDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException for wrong current password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordHash: 'old-hash',
        deletedAt: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword('u1', changeDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getUserAssets', () => {
    it('should return user active assignments', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', deletedAt: null });
      const assignments = [{ id: 'a1', asset: { name: 'Laptop' } }];
      mockPrisma.assetAssignment.findMany.mockResolvedValue(assignments);

      const result = await service.getUserAssets('u1');

      expect(result).toEqual(assignments);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserAssets('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', deletedAt: null });
      mockPrisma.assetAssignment.count
        .mockResolvedValueOnce(3)  // active
        .mockResolvedValueOnce(10); // total
      mockPrisma.assetTransfer.count.mockResolvedValue(2);

      const result = await service.getUserStats('u1');

      expect(result).toEqual({
        activeAssignments: 3,
        totalAssignments: 10,
        pendingTransfers: 2,
      });
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserStats('x')).rejects.toThrow(NotFoundException);
    });
  });
});
