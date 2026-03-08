import { IsEnum } from 'class-validator';
import { AssetStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAssetStatusDto {
  @ApiProperty({ enum: AssetStatus })
  @IsEnum(AssetStatus)
  status: AssetStatus;
}
