import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFormat } from './dto/report-query.dto';

jest.mock('exceljs', () => {
  const mockWorksheet = {
    addRow: jest.fn(),
    getRow: jest.fn().mockReturnValue({
      font: {},
      fill: {},
    }),
    columns: [],
  };
  return {
    Workbook: jest.fn().mockImplementation(() => ({
      addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
      xlsx: {
        writeBuffer: jest.fn().mockResolvedValue(Buffer.from('xlsx-data')),
      },
    })),
  };
});

jest.mock('pdfkit', () => {
  const EventEmitter = require('events');
  return jest.fn().mockImplementation(() => {
    const doc = new EventEmitter();
    doc.fontSize = jest.fn().mockReturnValue(doc);
    doc.text = jest.fn().mockReturnValue(doc);
    doc.moveDown = jest.fn().mockReturnValue(doc);
    doc.font = jest.fn().mockReturnValue(doc);
    doc.end = jest.fn(() => {
      doc.emit('data', Buffer.from('pdf-chunk'));
      doc.emit('end');
    });
    return doc;
  });
});

describe('ReportsService', () => {
  let service: ReportsService;

  const mockPrisma = {
    asset: {
      findMany: jest.fn(),
    },
    assetAssignment: {
      findMany: jest.fn(),
    },
    assetTransfer: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  describe('generateAssetsReport', () => {
    const mockAssets = [
      {
        assetTag: 'TAG-001',
        serialNumber: 'SN001',
        name: 'Laptop',
        category: { name: 'Electronics' },
        vendor: { name: 'Dell' },
        location: { name: 'HQ' },
        status: 'available',
        purchaseDate: new Date('2024-01-15'),
        purchaseCost: 1500,
        currentValue: 1200,
        warrantyEndDate: new Date('2027-01-15'),
      },
    ];

    it('should generate CSV report', async () => {
      mockPrisma.asset.findMany.mockResolvedValue(mockAssets);

      const result = await service.generateAssetsReport({ format: ReportFormat.CSV });

      expect(result).toBeInstanceOf(Buffer);
      const csv = result.toString();
      expect(csv).toContain('Asset Tag');
      expect(csv).toContain('TAG-001');
    });

    it('should generate XLSX report', async () => {
      mockPrisma.asset.findMany.mockResolvedValue(mockAssets);

      const result = await service.generateAssetsReport({ format: ReportFormat.XLSX });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate PDF report', async () => {
      mockPrisma.asset.findMany.mockResolvedValue(mockAssets);

      const result = await service.generateAssetsReport({ format: ReportFormat.PDF });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle empty data for CSV', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);

      const result = await service.generateAssetsReport({ format: ReportFormat.CSV });

      expect(result.toString()).toContain('No data available');
    });

    it('should handle null optional fields', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          ...mockAssets[0],
          serialNumber: null,
          category: null,
          vendor: null,
          location: null,
          currentValue: null,
          warrantyEndDate: null,
        },
      ]);

      const result = await service.generateAssetsReport({ format: ReportFormat.CSV });
      const csv = result.toString();

      expect(csv).toContain('TAG-001');
    });

    it('should apply date filters', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);

      await service.generateAssetsReport({
        format: ReportFormat.CSV,
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      });

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            purchaseDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });

    it('should handle empty data for XLSX', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);

      const result = await service.generateAssetsReport({ format: ReportFormat.XLSX });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle empty data for PDF', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);

      const result = await service.generateAssetsReport({ format: ReportFormat.PDF });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle more than 50 rows in PDF', async () => {
      const manyAssets = Array.from({ length: 55 }, (_, i) => ({
        ...mockAssets[0],
        assetTag: `TAG-${i}`,
      }));
      mockPrisma.asset.findMany.mockResolvedValue(manyAssets);

      const result = await service.generateAssetsReport({ format: ReportFormat.PDF });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should prevent CSV injection', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          ...mockAssets[0],
          name: '=CMD("malicious")',
        },
      ]);

      const result = await service.generateAssetsReport({ format: ReportFormat.CSV });
      const csv = result.toString();

      expect(csv).toContain("'=CMD");
    });
  });

  describe('generateAssignmentsReport', () => {
    const mockAssignments = [
      {
        asset: { assetTag: 'TAG-001', name: 'Laptop' },
        assignedToUser: { firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
        assignedByUser: { firstName: 'Admin', lastName: 'User' },
        assignedAt: new Date('2024-06-01'),
        expectedReturnDate: new Date('2024-12-31'),
        returnedAt: null,
        isActive: true,
        assignCondition: 'Good',
        returnCondition: null,
      },
    ];

    it('should generate CSV assignments report', async () => {
      mockPrisma.assetAssignment.findMany.mockResolvedValue(mockAssignments);

      const result = await service.generateAssignmentsReport({ format: ReportFormat.CSV });

      const csv = result.toString();
      expect(csv).toContain('Asset Tag');
      expect(csv).toContain('John Doe');
    });

    it('should generate XLSX assignments report', async () => {
      mockPrisma.assetAssignment.findMany.mockResolvedValue(mockAssignments);

      const result = await service.generateAssignmentsReport({ format: ReportFormat.XLSX });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate PDF assignments report', async () => {
      mockPrisma.assetAssignment.findMany.mockResolvedValue(mockAssignments);

      const result = await service.generateAssignmentsReport({ format: ReportFormat.PDF });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should apply date filters', async () => {
      mockPrisma.assetAssignment.findMany.mockResolvedValue([]);

      await service.generateAssignmentsReport({
        format: ReportFormat.CSV,
        dateFrom: '2024-01-01',
      });

      expect(mockPrisma.assetAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedAt: { gte: expect.any(Date) },
          }),
        }),
      );
    });
  });

  describe('generateTransfersReport', () => {
    const mockTransfers = [
      {
        asset: { assetTag: 'TAG-001', name: 'Laptop' },
        fromUser: { firstName: 'Alice', lastName: 'A' },
        toUser: { firstName: 'Bob', lastName: 'B' },
        requestedByUser: { firstName: 'Admin', lastName: 'User' },
        requestedAt: new Date('2024-06-01'),
        status: 'completed',
        completedAt: new Date('2024-06-05'),
        transferReason: 'Department change',
      },
    ];

    it('should generate CSV transfers report', async () => {
      mockPrisma.assetTransfer.findMany.mockResolvedValue(mockTransfers);

      const result = await service.generateTransfersReport({ format: ReportFormat.CSV });

      const csv = result.toString();
      expect(csv).toContain('Alice A');
      expect(csv).toContain('Bob B');
    });

    it('should handle null fromUser', async () => {
      mockPrisma.assetTransfer.findMany.mockResolvedValue([
        { ...mockTransfers[0], fromUser: null },
      ]);

      const result = await service.generateTransfersReport({ format: ReportFormat.CSV });
      const csv = result.toString();

      expect(csv).toContain('Inventory');
    });

    it('should generate XLSX transfers report', async () => {
      mockPrisma.assetTransfer.findMany.mockResolvedValue(mockTransfers);

      const result = await service.generateTransfersReport({ format: ReportFormat.XLSX });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate PDF transfers report', async () => {
      mockPrisma.assetTransfer.findMany.mockResolvedValue(mockTransfers);

      const result = await service.generateTransfersReport({ format: ReportFormat.PDF });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should apply date filters', async () => {
      mockPrisma.assetTransfer.findMany.mockResolvedValue([]);

      await service.generateTransfersReport({
        format: ReportFormat.CSV,
        dateTo: '2024-12-31',
      });

      expect(mockPrisma.assetTransfer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            requestedAt: { lte: expect.any(Date) },
          }),
        }),
      );
    });
  });

  describe('generateUsersReport', () => {
    const mockUsers = [
      {
        email: 'john@test.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-1234',
        department: { name: 'Engineering' },
        userRoles: [{ role: { name: 'EMPLOYEE' } }, { role: { name: 'ASSET_MANAGER' } }],
        isActive: true,
        isMfaEnabled: false,
        createdAt: new Date('2024-01-15'),
      },
    ];

    it('should generate CSV users report', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.generateUsersReport({ format: ReportFormat.CSV });

      const csv = result.toString();
      expect(csv).toContain('john@test.com');
      expect(csv).toContain('EMPLOYEE, ASSET_MANAGER');
    });

    it('should handle user without department', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { ...mockUsers[0], department: null, phone: null },
      ]);

      const result = await service.generateUsersReport({ format: ReportFormat.CSV });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate XLSX users report', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.generateUsersReport({ format: ReportFormat.XLSX });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate PDF users report', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.generateUsersReport({ format: ReportFormat.PDF });

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('generateAuditLogsReport', () => {
    const mockLogs = [
      {
        entityType: 'asset',
        entityId: 'a1',
        action: 'create',
        user: { firstName: 'Admin', lastName: 'User' },
        ipAddress: '127.0.0.1',
        createdAt: new Date('2024-06-01'),
      },
    ];

    it('should generate CSV audit logs report', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.generateAuditLogsReport({ format: ReportFormat.CSV });

      const csv = result.toString();
      expect(csv).toContain('asset');
      expect(csv).toContain('Admin User');
    });

    it('should handle log without user', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { ...mockLogs[0], user: null },
      ]);

      const result = await service.generateAuditLogsReport({ format: ReportFormat.CSV });
      const csv = result.toString();

      expect(csv).toContain('System');
    });

    it('should handle log without ipAddress', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { ...mockLogs[0], ipAddress: null },
      ]);

      const result = await service.generateAuditLogsReport({ format: ReportFormat.CSV });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate XLSX audit logs report', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.generateAuditLogsReport({ format: ReportFormat.XLSX });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate PDF audit logs report', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.generateAuditLogsReport({ format: ReportFormat.PDF });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should apply date filters', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.generateAuditLogsReport({
        format: ReportFormat.CSV,
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
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
  });
});
