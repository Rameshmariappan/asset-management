import { IsString, IsUUID, IsObject, IsOptional } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  entityType: string;

  @IsUUID()
  entityId: string;

  @IsString()
  action: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsObject()
  changes?: Record<string, any>;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
