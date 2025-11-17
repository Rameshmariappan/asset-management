import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('audit-logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Get all audit logs with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of audit logs' })
  async findAll(@Query() queryDto: QueryAuditLogDto) {
    return this.service.findAll(queryDto);
  }

  @Get('statistics')
  @Roles('SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Get audit log statistics' })
  @ApiResponse({ status: 200, description: 'Audit log statistics' })
  async getStatistics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getStatistics(dateFrom, dateTo);
  }

  @Get('recent')
  @Roles('SUPER_ADMIN', 'AUDITOR', 'ASSET_MANAGER')
  @ApiOperation({ summary: 'Get recent audit logs' })
  @ApiResponse({ status: 200, description: 'Recent audit logs' })
  async findRecent(@Query('limit') limit?: number) {
    return this.service.findRecent(limit || 50);
  }

  @Get('entity/:entityType/:entityId')
  @Roles('SUPER_ADMIN', 'AUDITOR', 'ASSET_MANAGER')
  @ApiOperation({ summary: 'Get audit logs for a specific entity' })
  @ApiParam({ name: 'entityType', example: 'Asset' })
  @ApiParam({ name: 'entityId', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Entity audit logs' })
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.service.findByEntity(entityType, entityId);
  }

  @Get('user/:userId')
  @Roles('SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: "Get audit logs for a specific user's actions" })
  @ApiResponse({ status: 200, description: "User's audit logs" })
  async findByUser(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findByUser(userId, page, limit);
  }
}
