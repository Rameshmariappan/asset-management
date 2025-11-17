import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { Condition } from '@prisma/client';

export class CreateAssignmentDto {
  @ApiProperty()
  @IsUUID()
  assetId: string;

  @ApiProperty()
  @IsUUID()
  assignedToUserId: string;

  @ApiProperty({ example: '2024-12-31', required: false })
  @IsOptional()
  @IsDateString()
  expectedReturnDate?: string;

  @ApiProperty({ enum: Condition, example: 'Excellent' })
  @IsEnum(Condition)
  assignCondition: Condition;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  assignConditionRating: number;

  @ApiProperty({ example: 'Laptop in excellent condition', required: false })
  @IsOptional()
  @IsString()
  assignNotes?: string;

  @ApiProperty({ 
    example: 'data:image/png;base64,...',
    description: 'Base64 encoded signature image',
    required: false
  })
  @IsOptional()
  @IsString()
  assignSignature?: string;
}
