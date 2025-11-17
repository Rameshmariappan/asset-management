import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportFormat, ReportQueryDto } from './dto/report-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('assets')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER', 'AUDITOR')
  @ApiOperation({ summary: 'Generate assets report (CSV, XLSX, PDF)' })
  @ApiResponse({ status: 200, description: 'Assets report generated' })
  async generateAssetsReport(
    @Query() queryDto: ReportQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateAssetsReport(queryDto);
    this.sendFile(res, buffer, 'assets-report', queryDto.format);
  }

  @Get('assignments')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER', 'AUDITOR')
  @ApiOperation({ summary: 'Generate assignments report (CSV, XLSX, PDF)' })
  @ApiResponse({ status: 200, description: 'Assignments report generated' })
  async generateAssignmentsReport(
    @Query() queryDto: ReportQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateAssignmentsReport(queryDto);
    this.sendFile(res, buffer, 'assignments-report', queryDto.format);
  }

  @Get('transfers')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER', 'AUDITOR')
  @ApiOperation({ summary: 'Generate transfers report (CSV, XLSX, PDF)' })
  @ApiResponse({ status: 200, description: 'Transfers report generated' })
  async generateTransfersReport(
    @Query() queryDto: ReportQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateTransfersReport(queryDto);
    this.sendFile(res, buffer, 'transfers-report', queryDto.format);
  }

  @Get('users')
  @Roles('SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Generate users report (CSV, XLSX, PDF)' })
  @ApiResponse({ status: 200, description: 'Users report generated' })
  async generateUsersReport(
    @Query() queryDto: ReportQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateUsersReport(queryDto);
    this.sendFile(res, buffer, 'users-report', queryDto.format);
  }

  @Get('audit-logs')
  @Roles('SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Generate audit logs report (CSV, XLSX, PDF)' })
  @ApiResponse({ status: 200, description: 'Audit logs report generated' })
  async generateAuditLogsReport(
    @Query() queryDto: ReportQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateAuditLogsReport(queryDto);
    this.sendFile(res, buffer, 'audit-logs-report', queryDto.format);
  }

  /**
   * Helper method to send file response
   */
  private sendFile(
    res: Response,
    buffer: Buffer,
    filename: string,
    format: ReportFormat,
  ) {
    const timestamp = new Date().toISOString().split('T')[0];
    const fullFilename = `${filename}-${timestamp}.${format}`;

    let contentType = 'text/csv';
    if (format === ReportFormat.XLSX) {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (format === ReportFormat.PDF) {
      contentType = 'application/pdf';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fullFilename}"`);
    res.send(buffer);
  }
}
