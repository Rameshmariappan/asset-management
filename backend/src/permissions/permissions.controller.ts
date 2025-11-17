import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('permissions')
@ApiBearerAuth('JWT-auth')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER', 'AUDITOR')
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  findAll() {
    return this.service.findAll();
  }

  @Get('resource/:resource')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER')
  @ApiOperation({ summary: 'Get permissions by resource' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  findByResource(@Param('resource') resource: string) {
    return this.service.findByResource(resource);
  }
}
