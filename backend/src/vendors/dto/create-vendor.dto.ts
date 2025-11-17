import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, IsEmail, IsBoolean } from 'class-validator';

export class CreateVendorDto {
  @ApiProperty({ example: 'Dell Inc.' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'DELL' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  code: string;

  @ApiProperty({ example: 'sales@dell.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'https://dell.com', required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ example: '123 Main St, Austin, TX', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiProperty({ example: '12-3456789', required: false })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiProperty({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
