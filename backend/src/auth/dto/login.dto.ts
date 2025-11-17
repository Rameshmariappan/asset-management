import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@assetapp.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '123456', required: false })
  @IsOptional()
  @IsString()
  mfaCode?: string;
}
