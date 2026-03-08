import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

jest.mock('bcrypt');
jest.mock('speakeasy');
jest.mock('qrcode');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    mfaSecret: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      create: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    userRole: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => {
      if (typeof cb === 'function') return cb(mockPrisma);
      return Promise.all(cb);
    }),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultVal?: string) => {
      const map: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_EXPIRATION: '15m',
        JWT_REFRESH_EXPIRATION: '7d',
      };
      return map[key] || defaultVal;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'Password@123' };

    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      isActive: true,
      isMfaEnabled: false,
      tenantId: 'tenant-1',
      isPlatformAdmin: false,
      firstName: 'Test',
      lastName: 'User',
      organization: { id: 'org-1', name: 'Test Org', slug: 'test-org', logoUrl: null, isActive: true },
      userRoles: [{ role: { name: 'EMPLOYEE' } }],
      mfaSecret: null,
    };

    it('should return tokens on valid credentials', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.roles).toEqual(['EMPLOYEE']);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, isActive: false });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return requiresMfa when MFA enabled and no code provided', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        isMfaEnabled: true,
        mfaSecret: { secret: 'base32-secret' },
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.requiresMfa).toBe(true);
    });

    it('should exclude soft-deleted users', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'Password@123',
      firstName: 'New',
      lastName: 'User',
      organizationName: 'New Org',
    };

    it('should throw ConflictException if user already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create org, user, and assign SUPER_ADMIN role', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');

      mockPrisma.organization.create.mockResolvedValue({
        id: 'org-1',
        name: 'New Org',
        slug: 'new-org-abc123',
        logoUrl: null,
      });
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        passwordHash: 'hashed-pw',
        tenantId: 'org-1',
      });
      mockPrisma.role.findFirst.mockResolvedValue({
        id: 'role-1',
        name: 'SUPER_ADMIN',
      });
      mockPrisma.userRole.create.mockResolvedValue({});

      const result = await service.register(registerDto);

      expect(result.message).toContain('registered successfully');
      expect(result.user.roles).toContain('SUPER_ADMIN');
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('refreshTokens', () => {
    it('should throw UnauthorizedException for invalid token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshTokens('user-1', 'invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        userId: 'user-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        user: { userRoles: [] },
      });

      await expect(
        service.refreshTokens('user-1', 'revoked-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 86400000), // expired
        user: { userRoles: [] },
      });

      await expect(
        service.refreshTokens('user-1', 'expired-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token belongs to different user', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        userId: 'user-2',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        user: { userRoles: [] },
      });

      await expect(
        service.refreshTokens('user-1', 'other-user-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should return success even for non-existent email (prevent enumeration)', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'nonexistent@example.com',
      });

      expect(result.message).toContain('password reset link');
    });

    it('should invalidate existing tokens and create new one', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
      prisma.passwordResetToken.updateMany.mockResolvedValue({});
      prisma.passwordResetToken.create.mockResolvedValue({});

      const result = await service.forgotPassword({
        email: 'test@example.com',
      });

      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalled();
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
      expect((result as any).resetToken).toBeDefined();
    });
  });

  describe('resetPassword', () => {
    it('should throw BadRequestException for invalid token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'invalid', newPassword: 'New@123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already-used token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        user: { id: 'user-1' },
      });

      await expect(
        service.resetPassword({ token: 'used', newPassword: 'New@123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        usedAt: null,
        expiresAt: new Date(Date.now() - 3600000),
        user: { id: 'user-1' },
      });

      await expect(
        service.resetPassword({ token: 'expired', newPassword: 'New@123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login - inactive organization', () => {
    const loginDto = { email: 'test@example.com', password: 'Password@123' };

    it('should throw UnauthorizedException when organization is inactive', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        isActive: true,
        isMfaEnabled: false,
        tenantId: 'tenant-1',
        isPlatformAdmin: false,
        organization: { id: 'org-1', name: 'Test Org', isActive: false },
        userRoles: [{ role: { name: 'EMPLOYEE' } }],
        mfaSecret: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('login - MFA verification', () => {
    const mfaUser = {
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      isActive: true,
      isMfaEnabled: true,
      tenantId: 'tenant-1',
      isPlatformAdmin: false,
      firstName: 'Test',
      lastName: 'User',
      organization: { id: 'org-1', name: 'Test Org', slug: 'test-org', logoUrl: null, isActive: true },
      userRoles: [{ role: { name: 'EMPLOYEE' } }],
      mfaSecret: { secret: 'base32-secret' },
    };

    it('should login successfully with valid MFA code', async () => {
      prisma.user.findFirst.mockResolvedValue(mfaUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({
        email: 'test@example.com',
        password: 'Password@123',
        mfaCode: '123456',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException for invalid MFA code', async () => {
      prisma.user.findFirst.mockResolvedValue(mfaUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'Password@123',
          mfaCode: '000000',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register - SUPER_ADMIN role not found', () => {
    it('should throw BadRequestException when SUPER_ADMIN role missing', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.role.findFirst.mockResolvedValue(null);

      await expect(
        service.register({
          email: 'new@example.com',
          password: 'Password@123',
          firstName: 'New',
          lastName: 'User',
          organizationName: 'Org',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshTokens - success', () => {
    it('should rotate tokens and return new pair', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        ipAddress: '127.0.0.1',
        userAgent: 'TestAgent',
        user: {
          email: 'test@example.com',
          tenantId: 'tenant-1',
          userRoles: [{ role: { name: 'EMPLOYEE' } }],
        },
      });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshTokens('user-1', 'valid-token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('setupMfa', () => {
    it('should generate secret and QR code', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      });
      (speakeasy.generateSecret as jest.Mock).mockReturnValue({
        base32: 'MOCK_SECRET',
        otpauth_url: 'otpauth://totp/test',
      });
      (qrcode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,...');
      prisma.mfaSecret.upsert.mockResolvedValue({});

      const result = await service.setupMfa('user-1');

      expect(result.secret).toBe('MOCK_SECRET');
      expect(result.qrCode).toBeDefined();
      expect(result.message).toContain('MFA setup initiated');
    });

    it('should throw BadRequestException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.setupMfa('bad-user')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyAndEnableMfa', () => {
    it('should enable MFA with valid code and return backup codes', async () => {
      prisma.mfaSecret.findUnique.mockResolvedValue({
        userId: 'user-1',
        secret: 'MOCK_SECRET',
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-backup');
      prisma.mfaSecret.update.mockResolvedValue({});
      prisma.user.update.mockResolvedValue({});

      const result = await service.verifyAndEnableMfa('user-1', '123456');

      expect(result.message).toContain('MFA enabled');
      expect(result.backupCodes).toBeDefined();
      expect(result.backupCodes.length).toBe(10);
    });

    it('should throw BadRequestException if MFA not set up', async () => {
      prisma.mfaSecret.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyAndEnableMfa('user-1', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid code', async () => {
      prisma.mfaSecret.findUnique.mockResolvedValue({
        userId: 'user-1',
        secret: 'MOCK_SECRET',
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(
        service.verifyAndEnableMfa('user-1', '000000'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('disableMfa', () => {
    it('should disable MFA with valid code', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        mfaSecret: { secret: 'MOCK_SECRET' },
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      prisma.mfaSecret.delete.mockResolvedValue({});
      prisma.user.update.mockResolvedValue({});

      const result = await service.disableMfa('user-1', '123456');

      expect(result.message).toContain('MFA disabled');
    });

    it('should throw BadRequestException if MFA not enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        mfaSecret: null,
      });

      await expect(service.disableMfa('user-1', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid code', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        mfaSecret: { secret: 'MOCK_SECRET' },
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.disableMfa('user-1', '000000')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resetPassword - success', () => {
    it('should reset password and revoke all refresh tokens', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 3600000),
        user: { id: 'user-1' },
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-pw');
      prisma.user.update.mockResolvedValue({});
      prisma.passwordResetToken.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({});

      const result = await service.resetPassword({
        token: 'valid-token',
        newPassword: 'NewPass@123',
      });

      expect(result.message).toContain('Password has been reset');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('some-token');

      expect(result.message).toBe('Logged out successfully');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });
  });
});
