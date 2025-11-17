import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Condition } from '@prisma/client';

export class ReturnAssignmentDto {
  @ApiProperty({ enum: Condition, example: 'Good' })
  @IsEnum(Condition)
  returnCondition: Condition;

  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  returnConditionRating: number;

  @ApiProperty({ 
    example: ['data:image/png;base64,...'],
    description: 'Array of base64 encoded photo URLs (mandatory)',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  returnPhotoUrls: string[];

  @ApiProperty({ example: 'Minor scratches on case', required: false })
  @IsOptional()
  @IsString()
  returnNotes?: string;

  @ApiProperty({ 
    example: 'data:image/png;base64,...',
    description: 'Base64 encoded signature image',
    required: false
  })
  @IsOptional()
  @IsString()
  returnSignature?: string;
}
