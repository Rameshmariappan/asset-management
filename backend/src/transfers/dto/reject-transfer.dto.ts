import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RejectTransferDto {
  @ApiProperty({ example: 'Asset needed for current project' })
  @IsString()
  rejectionReason: string;
}
