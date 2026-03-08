import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('RolesService', () => {
  let service: RolesService;

  const mockPrisma = {
    role: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return roles with permissions and user count', async () => {
      mockPrisma.role.findMany.mockResolvedValue([
        {
          id: 'r1',
          name: 'ADMIN',
          rolePermissions: [
            { permission: { id: 'p1', resource: 'assets', action: 'read' } },
          ],
          _count: { userRoles: 5 },
        },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].permissions).toEqual([{ id: 'p1', resource: 'assets', action: 'read' }]);
      expect(result[0].userCount).toBe(5);
    });

    it('should return empty array when no roles', async () => {
      mockPrisma.role.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return role with permissions and users', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'r1',
        name: 'ADMIN',
        rolePermissions: [
          { permission: { id: 'p1', resource: 'assets', action: 'read' } },
        ],
        userRoles: [
          { user: { id: 'u1', email: 'admin@test.com', firstName: 'Admin', lastName: 'User' } },
        ],
      });

      const result = await service.findOne('r1');

      expect(result.permissions).toEqual([{ id: 'p1', resource: 'assets', action: 'read' }]);
      expect(result.users).toEqual([{ id: 'u1', email: 'admin@test.com', firstName: 'Admin', lastName: 'User' }]);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);

      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRolePermissions', () => {
    it('should return permissions for a role', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'r1',
        rolePermissions: [
          { permission: { id: 'p1', resource: 'assets', action: 'read' } },
          { permission: { id: 'p2', resource: 'assets', action: 'write' } },
        ],
      });

      const result = await service.getRolePermissions('r1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'p1', resource: 'assets', action: 'read' });
    });

    it('should throw NotFoundException when role not found', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);

      await expect(service.getRolePermissions('x')).rejects.toThrow(NotFoundException);
    });
  });
});
