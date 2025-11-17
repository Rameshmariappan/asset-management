import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional } from 'class-validator';

export class CreateTransferDto {
  @ApiProperty()
  @IsUUID()
  assetId: string;

  @ApiProperty({ required: false, description: 'Current owner user ID (null if from inventory)' })
  @IsOptional()
  @IsUUID()
  fromUserId?: string;

  @ApiProperty({ description: 'New owner user ID' })
  @IsUUID()
  toUserId: string;

  @ApiProperty({ example: 'Employee changing departments', required: false })
  @IsOptional()
  @IsString()
  transferReason?: string;
}
