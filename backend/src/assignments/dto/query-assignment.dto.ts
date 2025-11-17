import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsBoolean, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAssignmentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  assignedByUserId?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

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

  @ApiProperty({ required: false, example: 'assignedAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'assignedAt';

  @ApiProperty({ required: false, example: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
