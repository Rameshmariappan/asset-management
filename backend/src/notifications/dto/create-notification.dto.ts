import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsEnum, IsObject, IsOptional, IsArray } from 'class-validator';
import { NotificationChannel } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'asset_assigned' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'Asset Assigned' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'You have been assigned laptop LAPTOP-001' })
  @IsString()
  message: string;

  @ApiProperty({ required: false, example: { assetId: 'uuid', assetTag: 'LAPTOP-001' } })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiProperty({ enum: NotificationChannel, example: 'in_app' })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;
}

export class BulkNotificationDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];

  @ApiProperty({ example: 'system_announcement' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'System Maintenance' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Scheduled maintenance on Sunday' })
  @IsString()
  message: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiProperty({ enum: NotificationChannel, example: 'in_app' })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;
}
