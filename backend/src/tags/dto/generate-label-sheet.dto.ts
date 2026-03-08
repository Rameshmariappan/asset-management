import { IsArray, IsUUID, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateLabelSheetDto {
  @ApiProperty({ type: [String], description: 'Array of asset IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  assetIds: string[];
}
