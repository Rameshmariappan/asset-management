import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, BulkNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER')
  @ApiOperation({ summary: 'Create and send a notification' })
  @ApiResponse({
    status: 201,
    description: 'Notification created and sent successfully',
  })
  async create(@Body() createDto: CreateNotificationDto) {
    return this.service.create(createDto);
  }

  @Post('bulk')
  @Roles('SUPER_ADMIN', 'ASSET_MANAGER')
  @ApiOperation({ summary: 'Send bulk notifications to multiple users' })
  @ApiResponse({
    status: 201,
    description: 'Bulk notifications sent successfully',
  })
  async createBulk(@Body() bulkDto: BulkNotificationDto) {
    return this.service.createBulk(bulkDto);
  }

  @Get('me')
  @ApiOperation({ summary: "Get current user's notifications" })
  @ApiResponse({ status: 200, description: "User's notifications" })
  async getMyNotifications(
    @CurrentUser() user: { userId: string },
    @Query() queryDto: QueryNotificationDto,
  ) {
    return this.service.findUserNotifications(user.userId, queryDto);
  }

  @Get('me/unread-count')
  @ApiOperation({ summary: "Get current user's unread notification count" })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getMyUnreadCount(@CurrentUser() user: { userId: string }) {
    return this.service.getUnreadCount(user.userId);
  }

  @Patch('me/:id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.markAsRead(id, user.userId);
  }

  @Patch('me/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser() user: { userId: string }) {
    return this.service.markAllAsRead(user.userId);
  }

  @Delete('me/:id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.delete(id, user.userId);
  }
}
