import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsIn } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({ example: 'jane.doe@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ASSET_MANAGER', enum: ['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD', 'EMPLOYEE', 'AUDITOR'] })
  @IsString()
  @IsIn(['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD', 'EMPLOYEE', 'AUDITOR'])
  roleName: string;
}
