import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsEnum, IsInt, Min, IsDateString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { AssetStatus } from '@prisma/client';

export class QueryAssetDto {
  @ApiProperty({ required: false, example: 'Dell' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiProperty({ enum: AssetStatus, required: false })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiProperty({ required: false, example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  purchaseDateFrom?: string;

  @ApiProperty({ required: false, example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  purchaseDateTo?: string;

  @ApiProperty({ required: false, example: 30, description: 'Warranty expiring in days' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  warrantyExpiringInDays?: number;

  @ApiProperty({ required: false, default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @ApiProperty({ required: false, example: 'createdAt', enum: ['createdAt', 'updatedAt', 'name', 'assetTag', 'purchaseDate', 'purchaseCost', 'status'] })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'name', 'assetTag', 'purchaseDate', 'purchaseCost', 'status'])
  sortBy?: string = 'createdAt';

  @ApiProperty({ required: false, example: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
