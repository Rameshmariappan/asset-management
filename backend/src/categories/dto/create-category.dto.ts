import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, IsUUID, IsNumber, Min, Max } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Laptops' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'LAPTOP' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  code: string;

  @ApiProperty({ example: 'All laptop computers', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'laptop', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ example: 20, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  depreciationRate?: number;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usefulLifeYears?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
