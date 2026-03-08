import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Roles } from '../auth/decorators/roles.decorator';
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

  @Patch('me')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update current organization details' })
  updateOrg(@Body() dto: UpdateOrganizationDto) {
    return this.service.updateOrganization(dto);
  }

  @Post('me/logo')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Upload organization logo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only PNG, JPG, GIF, and WebP files are allowed'), false);
      }
    },
  }))
  uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.service.updateLogo(file);
  }

  @Delete('me/logo')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Remove organization logo' })
  deleteLogo() {
    return this.service.deleteLogo();
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
