import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum ReportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
  PDF = 'pdf',
}

export class ReportQueryDto {
  @ApiProperty({ enum: ReportFormat, default: 'xlsx' })
  @IsEnum(ReportFormat)
  format: ReportFormat = ReportFormat.XLSX;

  @ApiProperty({ required: false, example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({ required: false, example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
