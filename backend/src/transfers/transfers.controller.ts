import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { ApproveTransferDto } from './dto/approve-transfer.dto';
import { RejectTransferDto } from './dto/reject-transfer.dto';
import { QueryTransferDto } from './dto/query-transfer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('transfers')
@Controller('transfers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TransfersController {
  constructor(private readonly service: TransfersService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD')
  @ApiOperation({ summary: 'Request an asset transfer' })
  @ApiResponse({
    status: 201,
    description: 'Transfer request created successfully',
  })
  @ApiResponse({ status: 400, description: 'Pending transfer already exists' })
  @ApiResponse({ status: 404, description: 'Asset or user not found' })
  async create(
    @Body() createDto: CreateTransferDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.create(createDto, user.userId);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD', 'AUDITOR')
  @ApiOperation({ summary: 'Get all transfers with pagination' })
  @ApiResponse({ status: 200, description: 'List of transfers' })
  async findAll(@Query() queryDto: QueryTransferDto) {
    return this.service.findAll(queryDto);
  }

  @Get('statistics')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD', 'AUDITOR')
  @ApiOperation({ summary: 'Get transfer statistics' })
  @ApiResponse({
    status: 200,
    description: 'Transfer statistics',
  })
  async getStatistics() {
    return this.service.getStatistics();
  }

  @Get('pending')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD')
  @ApiOperation({ summary: 'Get all pending transfers requiring approval' })
  @ApiResponse({ status: 200, description: 'List of pending transfers' })
  async findPendingTransfers() {
    return this.service.findPendingTransfers();
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD', 'AUDITOR')
  @ApiOperation({ summary: 'Get transfer by ID' })
  @ApiResponse({ status: 200, description: 'Transfer details' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/approve/manager')
  @Roles('SUPER_ADMIN', 'DEPT_HEAD')
  @ApiOperation({ summary: 'Manager approval (first level)' })
  @ApiResponse({
    status: 200,
    description: 'Transfer approved by manager',
  })
  @ApiResponse({ status: 400, description: 'Invalid transfer status' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async approveByManager(
    @Param('id') id: string,
    @Body() approveDto: ApproveTransferDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.approveByManager(id, approveDto, user.userId);
  }

  @Patch(':id/approve/admin')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER')
  @ApiOperation({ summary: 'Admin approval (second level) - completes transfer' })
  @ApiResponse({
    status: 200,
    description: 'Transfer approved by admin and completed',
  })
  @ApiResponse({ status: 400, description: 'Transfer not manager approved yet' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async approveByAdmin(
    @Param('id') id: string,
    @Body() approveDto: ApproveTransferDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.approveByAdmin(id, approveDto, user.userId);
  }

  @Patch(':id/reject')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD')
  @ApiOperation({ summary: 'Reject a transfer request' })
  @ApiResponse({ status: 200, description: 'Transfer rejected' })
  @ApiResponse({ status: 400, description: 'Cannot reject completed transfer' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async reject(
    @Param('id') id: string,
    @Body() rejectDto: RejectTransferDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.reject(id, rejectDto, user.userId);
  }
}
