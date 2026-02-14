import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PlatformService } from './platform.service';
import { PlatformAdmin } from '../auth/decorators/platform-admin.decorator';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';

@ApiTags('platform')
@ApiBearerAuth('JWT-auth')
@UseGuards(PlatformAdminGuard)
@PlatformAdmin()
@Controller('platform')
export class PlatformController {
  constructor(private readonly service: PlatformService) {}

  @Get('organizations')
  @ApiOperation({ summary: 'List all organizations (platform admin)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  listOrganizations(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.listOrganizations({
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('organizations/:id')
  @ApiOperation({ summary: 'Get organization details (platform admin)' })
  getOrganization(@Param('id') id: string) {
    return this.service.getOrganization(id);
  }

  @Patch('organizations/:id')
  @ApiOperation({ summary: 'Update organization (platform admin)' })
  updateOrganization(
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean; logoUrl?: string },
  ) {
    return this.service.updateOrganization(id, body);
  }
}
