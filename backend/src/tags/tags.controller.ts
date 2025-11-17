import {
  Controller,
  Post,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('tags')
@ApiBearerAuth('JWT-auth')
@Controller('tags')
export class TagsController {
  constructor(private readonly service: TagsService) {}

  @Post('asset/:id/qr-code')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER')
  @ApiOperation({ summary: 'Generate QR code for asset' })
  @ApiResponse({ status: 200, description: 'QR code generated successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  generateQRCode(@Param('id') id: string) {
    return this.service.generateQRCode(id);
  }

  @Post('asset/:id/barcode')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER')
  @ApiOperation({ summary: 'Generate barcode for asset' })
  @ApiResponse({ status: 200, description: 'Barcode generated successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  generateBarcode(@Param('id') id: string) {
    return this.service.generateBarcode(id);
  }

  @Post('asset/:id/all')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER')
  @ApiOperation({ summary: 'Generate both QR code and barcode for asset' })
  @ApiResponse({ status: 200, description: 'Tags generated successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  generateBothTags(@Param('id') id: string) {
    return this.service.generateBothTags(id);
  }

  @Post('label-sheet')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER')
  @ApiOperation({ summary: 'Generate printable label sheet for multiple assets' })
  @ApiResponse({ status: 200, description: 'Label sheet generated successfully' })
  generateLabelSheet(@Body('assetIds') assetIds: string[]) {
    return this.service.generateLabelSheet(assetIds);
  }
}
