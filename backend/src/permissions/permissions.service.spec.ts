import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PermissionsService', () => {
  let service: PermissionsService;

  const mockPrisma = {
    permission: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all permissions grouped by resource', async () => {
      const permissions = [
        { id: 'p1', resource: 'assets', action: 'read' },
        { id: 'p2', resource: 'assets', action: 'write' },
        { id: 'p3', resource: 'users', action: 'read' },
      ];
      mockPrisma.permission.findMany.mockResolvedValue(permissions);

      const result = await service.findAll();

      expect(result.all).toEqual(permissions);
      expect(result.grouped.assets).toHaveLength(2);
      expect(result.grouped.users).toHaveLength(1);
    });

    it('should return empty groups when no permissions', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result.all).toEqual([]);
      expect(result.grouped).toEqual({});
    });
  });

  describe('findByResource', () => {
    it('should return permissions for a specific resource', async () => {
      const permissions = [
        { id: 'p1', resource: 'assets', action: 'read' },
        { id: 'p2', resource: 'assets', action: 'write' },
      ];
      mockPrisma.permission.findMany.mockResolvedValue(permissions);

      const result = await service.findByResource('assets');

      expect(result).toEqual(permissions);
      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith({
        where: { resource: 'assets' },
        orderBy: { action: 'asc' },
      });
    });

    it('should return empty array for unknown resource', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([]);

      const result = await service.findByResource('unknown');

      expect(result).toEqual([]);
    });
  });
});
