import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { QueryAssetDto } from './dto/query-asset.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto';

@ApiTags('assets')
@ApiBearerAuth('JWT-auth')
@Controller('assets')
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER')
  @ApiOperation({ summary: 'Create new asset' })
  @ApiResponse({ status: 201, description: 'Asset created successfully' })
  @ApiResponse({ status: 409, description: 'Asset tag or serial number already exists' })
  create(@Body() createAssetDto: CreateAssetDto) {
    return this.service.create(createAssetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all assets with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Assets retrieved successfully' })
  @ApiQuery({ type: QueryAssetDto })
  findAll(@Query() queryDto: QueryAssetDto) {
    return this.service.findAll(queryDto);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get asset statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStatistics() {
    return this.service.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by ID' })
  @ApiResponse({ status: 200, description: 'Asset retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get asset assignment and transfer history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  getAssetHistory(@Param('id') id: string) {
    return this.service.getAssetHistory(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER')
  @ApiOperation({ summary: 'Update asset' })
  @ApiResponse({ status: 200, description: 'Asset updated successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  update(@Param('id') id: string, @Body() updateAssetDto: UpdateAssetDto) {
    return this.service.update(id, updateAssetDto);
  }

  @Patch(':id/status')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER')
  @ApiOperation({ summary: 'Update asset status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAssetStatusDto) {
    return this.service.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete asset (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Asset deleted successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete asset with active assignments' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/images')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER')
  @ApiOperation({ summary: 'Upload asset images (max 5 at once)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 5, {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only PNG, JPG, GIF, and WebP files are allowed'), false);
      }
    },
  }))
  uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }
    return this.service.uploadImages(id, files);
  }

  @Delete(':id/images')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER')
  @ApiOperation({ summary: 'Delete an asset image by URL' })
  deleteImage(
    @Param('id') id: string,
    @Body('imageUrl') imageUrl: string,
  ) {
    if (!imageUrl) {
      throw new BadRequestException('imageUrl is required');
    }
    return this.service.deleteImage(id, imageUrl);
  }
}
