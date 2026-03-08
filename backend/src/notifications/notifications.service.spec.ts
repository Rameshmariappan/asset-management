import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrisma = {
    notification: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        RESEND_API_KEY: '',
        SLACK_WEBHOOK_URL: '',
        FROM_EMAIL: 'test@test.com',
      };
      return map[key] || '';
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      userId: 'user-1',
      type: 'info',
      title: 'Test',
      message: 'Test message',
      channel: NotificationChannel.in_app,
    };

    it('should create an in-app notification', async () => {
      const notification = {
        id: 'n1',
        ...createDto,
        user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      };
      mockPrisma.notification.create.mockResolvedValue(notification);

      const result = await service.create(createDto);

      expect(result).toEqual(notification);
    });

    it('should attempt email send for email channel', async () => {
      const notification = {
        id: 'n1',
        ...createDto,
        channel: NotificationChannel.email,
        user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      };
      mockPrisma.notification.create.mockResolvedValue(notification);
      mockPrisma.notification.update.mockResolvedValue({});

      await service.create({ ...createDto, channel: NotificationChannel.email });

      // No error thrown — email send is logged but skipped (no API key)
      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });

    it('should attempt slack send for slack channel', async () => {
      const notification = {
        id: 'n1',
        ...createDto,
        channel: NotificationChannel.slack,
        user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      };
      mockPrisma.notification.create.mockResolvedValue(notification);
      mockPrisma.notification.update.mockResolvedValue({});

      await service.create({ ...createDto, channel: NotificationChannel.slack });

      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });

    it('should not throw when external send fails', async () => {
      const notification = {
        id: 'n1',
        ...createDto,
        channel: NotificationChannel.email,
        user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      };
      mockPrisma.notification.create.mockResolvedValue(notification);

      // Even if update for sentAt fails, it should not throw
      await expect(service.create({ ...createDto, channel: NotificationChannel.email })).resolves.toBeDefined();
    });
  });

  describe('createBulk', () => {
    it('should create notifications for multiple users', async () => {
      const bulkDto = {
        userIds: ['user-1', 'user-2'],
        type: 'info',
        title: 'Bulk',
        message: 'Bulk message',
        channel: NotificationChannel.in_app,
      };
      mockPrisma.notification.create.mockResolvedValue({
        id: 'n1',
        user: { id: 'user-1', firstName: 'J', lastName: 'D', email: 'j@t.com' },
      });

      const result = await service.createBulk(bulkDto);

      expect(result.count).toBe(2);
      expect(result.notifications).toHaveLength(2);
    });
  });

  describe('findUserNotifications', () => {
    it('should return paginated notifications', async () => {
      const queryDto = { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' as const };
      mockPrisma.notification.findMany.mockResolvedValue([{ id: 'n1' }]);
      mockPrisma.notification.count
        .mockResolvedValueOnce(1)  // total
        .mockResolvedValueOnce(0); // unread

      const result = await service.findUserNotifications('user-1', queryDto);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.unreadCount).toBe(0);
    });

    it('should apply isRead filter', async () => {
      const queryDto = { page: 1, limit: 10, isRead: false, sortBy: 'createdAt', sortOrder: 'desc' as const };
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findUserNotifications('user-1', queryDto);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', isRead: false }),
        }),
      );
    });

    it('should apply type filter', async () => {
      const queryDto = { page: 1, limit: 10, type: 'info', sortBy: 'createdAt', sortOrder: 'desc' as const };
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findUserNotifications('user-1', queryDto);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'info' }),
        }),
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({ id: 'n1', userId: 'user-1' });
      mockPrisma.notification.update.mockResolvedValue({ id: 'n1', isRead: true });

      const result = await service.markAsRead('n1', 'user-1');

      expect(result.isRead).toBe(true);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('x', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ count: 5 });
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({ id: 'n1', userId: 'user-1' });
      mockPrisma.notification.delete.mockResolvedValue({});

      const result = await service.delete('n1', 'user-1');

      expect(result).toEqual({ message: 'Notification deleted successfully' });
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.delete('x', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockPrisma.notification.count.mockResolvedValue(7);

      const result = await service.getUnreadCount('user-1');

      expect(result).toEqual({ unreadCount: 7 });
    });
  });

  describe('notifyAssetAssignment', () => {
    it('should create assignment notification', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 'n1',
        type: 'asset_assigned',
        user: { id: 'user-1', firstName: 'J', lastName: 'D', email: 'j@t.com' },
      });

      const result = await service.notifyAssetAssignment('user-1', 'TAG-001', 'Laptop');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'asset_assigned',
            title: 'Asset Assigned',
          }),
        }),
      );
    });
  });

  describe('notifyTransferRequest', () => {
    it('should create transfer request notification', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 'n1',
        type: 'transfer_requested',
        user: { id: 'user-1', firstName: 'J', lastName: 'D', email: 'j@t.com' },
      });

      await service.notifyTransferRequest('user-1', 'TAG-001', 'Alice', 'Bob');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'transfer_requested',
          }),
        }),
      );
    });
  });

  describe('notifyTransferApproval', () => {
    it('should create transfer approval notification', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 'n1',
        type: 'transfer_approved',
        user: { id: 'user-1', firstName: 'J', lastName: 'D', email: 'j@t.com' },
      });

      await service.notifyTransferApproval('user-1', 'TAG-001', 'approved');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'transfer_approved',
          }),
        }),
      );
    });
  });

  describe('create - with configured email/slack', () => {
    let serviceWithKeys: NotificationsService;

    const mockPrismaForKeys = {
      notification: {
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockConfigWithKeys = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          RESEND_API_KEY: 'test-resend-key',
          SLACK_WEBHOOK_URL: 'https://hooks.slack.com/test',
          FROM_EMAIL: 'test@test.com',
        };
        return map[key] || '';
      }),
    };

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          NotificationsService,
          { provide: PrismaService, useValue: mockPrismaForKeys },
          { provide: ConfigService, useValue: mockConfigWithKeys },
        ],
      }).compile();

      serviceWithKeys = module.get<NotificationsService>(NotificationsService);
    });

    it('should send email and update sentAt when email channel and API key configured', async () => {
      const notification = {
        id: 'n1',
        user: { id: 'u1', firstName: 'J', lastName: 'D', email: 'j@t.com' },
      };
      mockPrismaForKeys.notification.create.mockResolvedValue(notification);
      mockPrismaForKeys.notification.update.mockResolvedValue({});

      await serviceWithKeys.create({
        userId: 'u1', type: 'info', title: 'Test', message: 'msg',
        channel: NotificationChannel.email,
      });

      expect(mockPrismaForKeys.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'n1' },
          data: { sentAt: expect.any(Date) },
        }),
      );
    });

    it('should send slack and update sentAt when slack channel and webhook configured', async () => {
      const notification = {
        id: 'n2',
        user: { id: 'u1', firstName: 'J', lastName: 'D', email: 'j@t.com' },
      };
      mockPrismaForKeys.notification.create.mockResolvedValue(notification);
      mockPrismaForKeys.notification.update.mockResolvedValue({});

      await serviceWithKeys.create({
        userId: 'u1', type: 'info', title: 'Test', message: 'msg',
        channel: NotificationChannel.slack,
      });

      expect(mockPrismaForKeys.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'n2' },
          data: { sentAt: expect.any(Date) },
        }),
      );
    });

    it('should catch and log error when sentAt update fails', async () => {
      const notification = {
        id: 'n3',
        user: { id: 'u1', firstName: 'J', lastName: 'D', email: 'j@t.com' },
      };
      mockPrismaForKeys.notification.create.mockResolvedValue(notification);
      mockPrismaForKeys.notification.update.mockRejectedValue(new Error('DB error'));

      // Should not throw even though update fails
      const result = await serviceWithKeys.create({
        userId: 'u1', type: 'info', title: 'Test', message: 'msg',
        channel: NotificationChannel.email,
      });

      expect(result).toEqual(notification);
    });
  });
});
