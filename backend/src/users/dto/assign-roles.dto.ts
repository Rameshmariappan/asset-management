import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class AssignRolesDto {
  @ApiProperty({ example: ['ASSET_MANAGER', 'EMPLOYEE'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  roleNames: string[];
}
