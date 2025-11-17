import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  IsOptional,
  IsObject,
} from 'class-validator';
import { AssetStatus } from '@prisma/client';

export class CreateAssetDto {
  @ApiProperty({ example: 'LAPTOP-001' })
  @IsString()
  assetTag: string;

  @ApiProperty({ example: 'SN123456789', required: false })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiProperty({ example: 'Dell XPS 15' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'High-performance laptop for developers', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'XPS 15 9520', required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ example: 'Dell', required: false })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty()
  @IsUUID()
  vendorId: string;

  @ApiProperty()
  @IsUUID()
  locationId: string;

  @ApiProperty({ enum: AssetStatus, default: 'available' })
  @IsEnum(AssetStatus)
  status: AssetStatus;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  purchaseDate: string;

  @ApiProperty({ example: 1500.00 })
  @IsNumber()
  @Min(0)
  purchaseCost: number;

  @ApiProperty({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 100.00, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salvageValue?: number;

  @ApiProperty({ example: '2027-01-15', required: false })
  @IsOptional()
  @IsDateString()
  warrantyEndDate?: string;

  @ApiProperty({ example: '3-year manufacturer warranty', required: false })
  @IsOptional()
  @IsString()
  warrantyDetails?: string;

  @ApiProperty({ example: 'INV-2024-001', required: false })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiProperty({ example: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ 
    example: { ram: '32GB', storage: '1TB SSD', processor: 'Intel i7' },
    required: false 
  })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}
