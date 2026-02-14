import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('organizations')
@ApiBearerAuth('JWT-auth')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current organization details' })
  getCurrentOrg() {
    return this.service.getCurrentOrganization();
  }

  @Post('invitations')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Invite a user to the organization' })
  createInvitation(
    @Body() dto: CreateInvitationDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.service.createInvitation(dto, userId);
  }

  @Get('invitations')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'List invitations for current organization' })
  listInvitations() {
    return this.service.listInvitations();
  }

  @Delete('invitations/:id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Revoke an invitation' })
  revokeInvitation(@Param('id') id: string) {
    return this.service.revokeInvitation(id);
  }
}
