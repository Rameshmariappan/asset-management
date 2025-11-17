import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto, BulkNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { NotificationChannel } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private resendApiKey: string;
  private slackWebhookUrl: string;
  private fromEmail: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.resendApiKey = this.configService.get('RESEND_API_KEY') || '';
    this.slackWebhookUrl = this.configService.get('SLACK_WEBHOOK_URL') || '';
    this.fromEmail = this.configService.get('FROM_EMAIL') || 'noreply@assetapp.com';
  }

  /**
   * Create and send a notification
   */
  async create(createDto: CreateNotificationDto) {
    // Create in-app notification record
    const notification = await this.prisma.notification.create({
      data: {
        userId: createDto.userId,
        type: createDto.type,
        title: createDto.title,
        message: createDto.message,
        data: createDto.data,
        channel: createDto.channel,
        isRead: false,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Send via appropriate channel
    try {
      if (createDto.channel === NotificationChannel.email) {
        await this.sendEmail(notification.user.email, createDto.title, createDto.message);
      } else if (createDto.channel === NotificationChannel.slack) {
        await this.sendSlack(createDto.title, createDto.message, createDto.data);
      }

      // Update sentAt timestamp
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { sentAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Failed to send notification via ${createDto.channel}`, error);
      // Don't throw - notification is saved in DB even if external send fails
    }

    return notification;
  }

  /**
   * Send bulk notifications to multiple users
   */
  async createBulk(bulkDto: BulkNotificationDto) {
    const notifications = await Promise.all(
      bulkDto.userIds.map((userId) =>
        this.create({
          userId,
          type: bulkDto.type,
          title: bulkDto.title,
          message: bulkDto.message,
          data: bulkDto.data,
          channel: bulkDto.channel,
        }),
      ),
    );

    return {
      count: notifications.length,
      notifications,
    };
  }

  /**
   * Get user's notifications with pagination
   */
  async findUserNotifications(userId: string, queryDto: QueryNotificationDto) {
    const { page, limit, isRead, type, sortBy, sortOrder } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (isRead !== undefined) where.isRead = isRead;
    if (type) where.type = type;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        unreadCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  /**
   * Delete a notification
   */
  async delete(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    return { message: 'Notification deleted successfully' };
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { unreadCount: count };
  }

  /**
   * Send email notification using Resend
   */
  private async sendEmail(to: string, subject: string, message: string) {
    if (!this.resendApiKey) {
      this.logger.warn('Resend API key not configured, skipping email');
      return;
    }

    try {
      // Note: In production, you would use the Resend SDK
      // For now, we'll just log it
      this.logger.log(`[EMAIL] To: ${to}, Subject: ${subject}, Message: ${message}`);

      // Uncomment when Resend is configured:
      // const { Resend } = require('resend');
      // const resend = new Resend(this.resendApiKey);
      // await resend.emails.send({
      //   from: this.fromEmail,
      //   to,
      //   subject,
      //   html: `<p>${message}</p>`,
      // });
    } catch (error) {
      this.logger.error('Failed to send email', error);
      throw error;
    }
  }

  /**
   * Send Slack notification using webhook
   */
  private async sendSlack(title: string, message: string, data?: any) {
    if (!this.slackWebhookUrl) {
      this.logger.warn('Slack webhook URL not configured, skipping Slack notification');
      return;
    }

    try {
      this.logger.log(`[SLACK] Title: ${title}, Message: ${message}`);

      // Uncomment when Slack webhook is configured:
      // const response = await fetch(this.slackWebhookUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     text: title,
      //     blocks: [
      //       {
      //         type: 'section',
      //         text: {
      //           type: 'mrkdwn',
      //           text: `*${title}*\n${message}`,
      //         },
      //       },
      //     ],
      //   }),
      // });
    } catch (error) {
      this.logger.error('Failed to send Slack notification', error);
      throw error;
    }
  }

  /**
   * Helper method to notify about asset assignment
   */
  async notifyAssetAssignment(userId: string, assetTag: string, assetName: string) {
    return this.create({
      userId,
      type: 'asset_assigned',
      title: 'Asset Assigned',
      message: `You have been assigned ${assetName} (${assetTag})`,
      data: { assetTag, assetName },
      channel: NotificationChannel.in_app,
    });
  }

  /**
   * Helper method to notify about transfer request
   */
  async notifyTransferRequest(userId: string, assetTag: string, from: string, to: string) {
    return this.create({
      userId,
      type: 'transfer_requested',
      title: 'Transfer Request',
      message: `Transfer requested for ${assetTag} from ${from} to ${to}`,
      data: { assetTag, from, to },
      channel: NotificationChannel.in_app,
    });
  }

  /**
   * Helper method to notify about transfer approval
   */
  async notifyTransferApproval(userId: string, assetTag: string, status: string) {
    return this.create({
      userId,
      type: 'transfer_approved',
      title: 'Transfer Approved',
      message: `Transfer for ${assetTag} has been ${status}`,
      data: { assetTag, status },
      channel: NotificationChannel.in_app,
    });
  }
}
