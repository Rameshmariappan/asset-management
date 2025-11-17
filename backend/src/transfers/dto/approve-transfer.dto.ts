import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ApproveTransferDto {
  @ApiProperty({ example: 'Approved for departmental transfer', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
