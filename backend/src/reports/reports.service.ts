import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFormat, ReportQueryDto } from './dto/report-query.dto';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate assets report
   */
  async generateAssetsReport(queryDto: ReportQueryDto): Promise<Buffer> {
    const where: any = { deletedAt: null };

    if (queryDto.dateFrom || queryDto.dateTo) {
      where.purchaseDate = {};
      if (queryDto.dateFrom) where.purchaseDate.gte = new Date(queryDto.dateFrom);
      if (queryDto.dateTo) where.purchaseDate.lte = new Date(queryDto.dateTo);
    }

    const assets = await this.prisma.asset.findMany({
      where,
      include: {
        category: { select: { name: true } },
        vendor: { select: { name: true } },
        location: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = assets.map((asset) => ({
      'Asset Tag': asset.assetTag,
      'Serial Number': asset.serialNumber || '',
      'Name': asset.name,
      'Category': asset.category.name,
      'Vendor': asset.vendor.name,
      'Location': asset.location.name,
      'Status': asset.status,
      'Purchase Date': asset.purchaseDate.toISOString().split('T')[0],
      'Purchase Cost': asset.purchaseCost.toString(),
      'Current Value': asset.currentValue?.toString() || '',
      'Warranty End': asset.warrantyEndDate?.toISOString().split('T')[0] || '',
    }));

    if (queryDto.format === ReportFormat.CSV) {
      return this.generateCSV(data);
    } else if (queryDto.format === ReportFormat.XLSX) {
      return this.generateXLSX('Assets Report', data);
    } else {
      return this.generatePDF('Assets Report', data);
    }
  }

  /**
   * Generate assignments report
   */
  async generateAssignmentsReport(queryDto: ReportQueryDto): Promise<Buffer> {
    const where: any = {};

    if (queryDto.dateFrom || queryDto.dateTo) {
      where.assignedAt = {};
      if (queryDto.dateFrom) where.assignedAt.gte = new Date(queryDto.dateFrom);
      if (queryDto.dateTo) where.assignedAt.lte = new Date(queryDto.dateTo);
    }

    const assignments = await this.prisma.assetAssignment.findMany({
      where,
      include: {
        asset: { select: { assetTag: true, name: true } },
        assignedToUser: { select: { firstName: true, lastName: true, email: true } },
        assignedByUser: { select: { firstName: true, lastName: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });

    const data = assignments.map((assignment) => ({
      'Asset Tag': assignment.asset.assetTag,
      'Asset Name': assignment.asset.name,
      'Assigned To': `${assignment.assignedToUser.firstName} ${assignment.assignedToUser.lastName}`,
      'Assigned By': `${assignment.assignedByUser.firstName} ${assignment.assignedByUser.lastName}`,
      'Assigned At': assignment.assignedAt.toISOString(),
      'Expected Return': assignment.expectedReturnDate?.toISOString().split('T')[0] || '',
      'Returned At': assignment.returnedAt?.toISOString() || '',
      'Status': assignment.isActive ? 'Active' : 'Returned',
      'Assign Condition': assignment.assignCondition || '',
      'Return Condition': assignment.returnCondition || '',
    }));

    if (queryDto.format === ReportFormat.CSV) {
      return this.generateCSV(data);
    } else if (queryDto.format === ReportFormat.XLSX) {
      return this.generateXLSX('Assignments Report', data);
    } else {
      return this.generatePDF('Assignments Report', data);
    }
  }

  /**
   * Generate transfers report
   */
  async generateTransfersReport(queryDto: ReportQueryDto): Promise<Buffer> {
    const where: any = {};

    if (queryDto.dateFrom || queryDto.dateTo) {
      where.requestedAt = {};
      if (queryDto.dateFrom) where.requestedAt.gte = new Date(queryDto.dateFrom);
      if (queryDto.dateTo) where.requestedAt.lte = new Date(queryDto.dateTo);
    }

    const transfers = await this.prisma.assetTransfer.findMany({
      where,
      include: {
        asset: { select: { assetTag: true, name: true } },
        fromUser: { select: { firstName: true, lastName: true } },
        toUser: { select: { firstName: true, lastName: true } },
        requestedByUser: { select: { firstName: true, lastName: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });

    const data = transfers.map((transfer) => ({
      'Asset Tag': transfer.asset.assetTag,
      'Asset Name': transfer.asset.name,
      'From': transfer.fromUser ? `${transfer.fromUser.firstName} ${transfer.fromUser.lastName}` : 'Inventory',
      'To': `${transfer.toUser.firstName} ${transfer.toUser.lastName}`,
      'Requested By': `${transfer.requestedByUser.firstName} ${transfer.requestedByUser.lastName}`,
      'Requested At': transfer.requestedAt.toISOString(),
      'Status': transfer.status,
      'Completed At': transfer.completedAt?.toISOString() || '',
      'Reason': transfer.transferReason || '',
    }));

    if (queryDto.format === ReportFormat.CSV) {
      return this.generateCSV(data);
    } else if (queryDto.format === ReportFormat.XLSX) {
      return this.generateXLSX('Transfers Report', data);
    } else {
      return this.generatePDF('Transfers Report', data);
    }
  }

  /**
   * Generate users report
   */
  async generateUsersReport(queryDto: ReportQueryDto): Promise<Buffer> {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        department: { select: { name: true } },
        userRoles: {
          include: {
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = users.map((user) => ({
      'Email': user.email,
      'First Name': user.firstName,
      'Last Name': user.lastName,
      'Phone': user.phone || '',
      'Department': user.department?.name || '',
      'Roles': user.userRoles.map((ur) => ur.role.name).join(', '),
      'Active': user.isActive ? 'Yes' : 'No',
      'MFA Enabled': user.isMfaEnabled ? 'Yes' : 'No',
      'Created At': user.createdAt.toISOString().split('T')[0],
    }));

    if (queryDto.format === ReportFormat.CSV) {
      return this.generateCSV(data);
    } else if (queryDto.format === ReportFormat.XLSX) {
      return this.generateXLSX('Users Report', data);
    } else {
      return this.generatePDF('Users Report', data);
    }
  }

  /**
   * Generate audit logs report
   */
  async generateAuditLogsReport(queryDto: ReportQueryDto): Promise<Buffer> {
    const where: any = {};

    if (queryDto.dateFrom || queryDto.dateTo) {
      where.createdAt = {};
      if (queryDto.dateFrom) where.createdAt.gte = new Date(queryDto.dateFrom);
      if (queryDto.dateTo) where.createdAt.lte = new Date(queryDto.dateTo);
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limit to 1000 records for performance
    });

    const data = logs.map((log) => ({
      'Entity Type': log.entityType,
      'Entity ID': log.entityId,
      'Action': log.action,
      'User': log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
      'IP Address': log.ipAddress || '',
      'Created At': log.createdAt.toISOString(),
    }));

    if (queryDto.format === ReportFormat.CSV) {
      return this.generateCSV(data);
    } else if (queryDto.format === ReportFormat.XLSX) {
      return this.generateXLSX('Audit Logs Report', data);
    } else {
      return this.generatePDF('Audit Logs Report', data);
    }
  }

  /**
   * Generate CSV from data
   */
  private generateCSV(data: Record<string, any>[]): Buffer {
    if (data.length === 0) {
      return Buffer.from('No data available');
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header]?.toString() || '';
            // Escape quotes and wrap in quotes if contains comma
            return value.includes(',') || value.includes('"')
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          })
          .join(','),
      ),
    ].join('\n');

    return Buffer.from(csv, 'utf-8');
  }

  /**
   * Generate XLSX from data
   */
  private async generateXLSX(title: string, data: Record<string, any>[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

    if (data.length === 0) {
      worksheet.addRow(['No data available']);
      return Buffer.from(await workbook.xlsx.writeBuffer());
    }

    // Add headers
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data
    data.forEach((row) => {
      worksheet.addRow(Object.values(row));
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength + 2;
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Generate PDF from data
   */
  private generatePDF(title: string, data: Record<string, any>[]): Buffer {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(20).text(title, { align: 'center' });
      doc.moveDown();

      // Date
      doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, { align: 'right' });
      doc.moveDown();

      if (data.length === 0) {
        doc.fontSize(12).text('No data available');
      } else {
        // Table headers
        const headers = Object.keys(data[0]);
        doc.fontSize(10);

        // Simple table (for production, consider using a table library)
        data.slice(0, 50).forEach((row, index) => {
          if (index === 0) {
            doc.font('Helvetica-Bold');
            doc.text(headers.map((h) => `${h}: ${row[h]}`).join(' | '));
            doc.font('Helvetica');
          } else {
            doc.text(headers.map((h) => `${h}: ${row[h]}`).join(' | '));
          }
          doc.moveDown(0.5);
        });

        if (data.length > 50) {
          doc.text(`... and ${data.length - 50} more records`, { align: 'center' });
        }
      }

      doc.end();
    });
  }
}
