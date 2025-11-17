import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { TransferStatus } from '@prisma/client';

export class QueryTransferDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  fromUserId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  toUserId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  requestedByUserId?: string;

  @ApiProperty({ enum: TransferStatus, required: false })
  @IsOptional()
  @IsEnum(TransferStatus)
  status?: TransferStatus;

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

  @ApiProperty({ required: false, example: 'requestedAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'requestedAt';

  @ApiProperty({ required: false, example: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
