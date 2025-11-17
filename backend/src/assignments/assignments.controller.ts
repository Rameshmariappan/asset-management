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
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReturnAssignmentDto } from './dto/return-assignment.dto';
import { QueryAssignmentDto } from './dto/query-assignment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('assignments')
@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AssignmentsController {
  constructor(private readonly service: AssignmentsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER')
  @ApiOperation({ summary: 'Assign an asset to a user' })
  @ApiResponse({
    status: 201,
    description: 'Asset assigned successfully',
  })
  @ApiResponse({ status: 400, description: 'Asset not available' })
  @ApiResponse({ status: 404, description: 'Asset or user not found' })
  @ApiResponse({ status: 409, description: 'Asset already assigned' })
  async create(
    @Body() createDto: CreateAssignmentDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.create(createDto, user.userId);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD', 'AUDITOR')
  @ApiOperation({ summary: 'Get all assignments with pagination' })
  @ApiResponse({ status: 200, description: 'List of assignments' })
  async findAll(@Query() queryDto: QueryAssignmentDto) {
    return this.service.findAll(queryDto);
  }

  @Get('statistics')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD', 'AUDITOR')
  @ApiOperation({ summary: 'Get assignment statistics' })
  @ApiResponse({
    status: 200,
    description: 'Assignment statistics',
  })
  async getStatistics() {
    return this.service.getStatistics();
  }

  @Get('active')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD', 'AUDITOR')
  @ApiOperation({ summary: 'Get all active assignments' })
  @ApiResponse({ status: 200, description: 'List of active assignments' })
  async findActiveAssignments() {
    return this.service.findActiveAssignments();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: "Get a user's assignments" })
  @ApiResponse({ status: 200, description: "User's assignments" })
  async findUserAssignments(
    @Param('userId') userId: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.service.findUserAssignments(userId, isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assignment by ID' })
  @ApiResponse({ status: 200, description: 'Assignment details' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/return')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER')
  @ApiOperation({ summary: 'Return an assigned asset' })
  @ApiResponse({ status: 200, description: 'Asset returned successfully' })
  @ApiResponse({ status: 400, description: 'Assignment already returned' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async returnAsset(
    @Param('id') id: string,
    @Body() returnDto: ReturnAssignmentDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.returnAsset(id, returnDto, user.userId);
  }
}
