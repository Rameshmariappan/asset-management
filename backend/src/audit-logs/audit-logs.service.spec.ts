import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditLogsService', () => {
  let service: AuditLogsService;

  const mockPrisma = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an audit log entry', async () => {
      const createDto = {
        entityType: 'asset',
        entityId: 'a1',
        action: 'create',
        userId: 'u1',
        changes: { after: { name: 'Laptop' } },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };
      const expected = { id: 'log-1', ...createDto, user: { id: 'u1', firstName: 'A', lastName: 'B', email: 'a@b.com' } };
      mockPrisma.auditLog.create.mockResolvedValue(expected);

      const result = await service.create(createDto);

      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      const queryDto = { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' as const };
      mockPrisma.auditLog.findMany.mockResolvedValue([{ id: 'log-1' }]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await service.findAll(queryDto);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should apply entityType filter', async () => {
      const queryDto = { page: 1, limit: 20, entityType: 'asset', sortBy: 'createdAt', sortOrder: 'desc' as const };
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findAll(queryDto);

      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityType: 'asset' }),
        }),
      );
    });

    it('should apply entityId filter', async () => {
      const queryDto = { page: 1, limit: 20, entityId: 'a1', sortBy: 'createdAt', sortOrder: 'desc' as const };
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findAll(queryDto);

      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityId: 'a1' }),
        }),
      );
    });

    it('should apply action filter', async () => {
      const queryDto = { page: 1, limit: 20, action: 'create', sortBy: 'createdAt', sortOrder: 'desc' as const };
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findAll(queryDto);

      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: 'create' }),
        }),
      );
    });

    it('should apply userId filter', async () => {
      const queryDto = { page: 1, limit: 20, userId: 'u1', sortBy: 'createdAt', sortOrder: 'desc' as const };
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findAll(queryDto);

      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'u1' }),
        }),
      );
    });

    it('should apply date range filter', async () => {
      const queryDto = {
        page: 1,
        limit: 20,
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findAll(queryDto);

      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });

    it('should apply only dateFrom', async () => {
      const queryDto = {
        page: 1,
        limit: 20,
        dateFrom: '2024-01-01',
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findAll(queryDto);

      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: expect.any(Date) },
          }),
        }),
      );
    });

    it('should calculate totalPages', async () => {
      const queryDto = { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' as const };
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(55);

      const result = await service.findAll(queryDto);

      expect(result.meta.totalPages).toBe(6);
    });
  });

  describe('findByEntity', () => {
    it('should return logs for a specific entity', async () => {
      const logs = [{ id: 'log-1', entityType: 'asset', entityId: 'a1' }];
      mockPrisma.auditLog.findMany.mockResolvedValue(logs);

      const result = await service.findByEntity('asset', 'a1');

      expect(result).toEqual(logs);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: 'asset', entityId: 'a1' },
          take: 500,
        }),
      );
    });
  });

  describe('findByUser', () => {
    it('should return paginated logs for a user', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([{ id: 'log-1' }]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await service.findByUser('u1', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should use default pagination values', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findByUser('u1');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  describe('findRecent', () => {
    it('should return recent logs with default limit', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([{ id: 'log-1' }]);

      const result = await service.findRecent();

      expect(result).toHaveLength(1);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it('should accept custom limit', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.findRecent(10);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  describe('getStatistics', () => {
    it('should return statistics without date filter', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(100);
      mockPrisma.auditLog.groupBy
        .mockResolvedValueOnce([
          { action: 'create', _count: 50 },
          { action: 'update', _count: 40 },
          { action: 'delete', _count: 10 },
        ])
        .mockResolvedValueOnce([
          { entityType: 'asset', _count: 60 },
          { entityType: 'user', _count: 40 },
        ]);
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { userId: 'u1' },
        { userId: 'u2' },
        { userId: 'u3' },
      ]);

      const result = await service.getStatistics();

      expect(result.totalLogs).toBe(100);
      expect(result.byAction).toEqual({ create: 50, update: 40, delete: 10 });
      expect(result.byEntityType).toEqual({ asset: 60, user: 40 });
      expect(result.uniqueUsers).toBe(3);
    });

    it('should apply date range filter', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(0);
      mockPrisma.auditLog.groupBy.mockResolvedValue([]);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.getStatistics('2024-01-01', '2024-12-31');

      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });

    it('should apply only dateFrom', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(0);
      mockPrisma.auditLog.groupBy.mockResolvedValue([]);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.getStatistics('2024-01-01');

      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: expect.any(Date) },
          }),
        }),
      );
    });
  });

  describe('logChange', () => {
    it('should log a create action', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.logChange('asset', 'a1', 'create', 'u1', null, { name: 'Laptop' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changes: { after: { name: 'Laptop' } },
          }),
        }),
      );
    });

    it('should log a delete action', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.logChange('asset', 'a1', 'delete', 'u1', { name: 'Laptop' }, null);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changes: { before: { name: 'Laptop' } },
          }),
        }),
      );
    });

    it('should log an update action with before and after', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.logChange('asset', 'a1', 'update', 'u1', { name: 'Old' }, { name: 'New' }, '127.0.0.1', 'Mozilla');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changes: { before: { name: 'Old' }, after: { name: 'New' } },
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla',
          }),
        }),
      );
    });
  });
});
