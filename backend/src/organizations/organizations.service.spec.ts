import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';

jest.mock('bcrypt');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  const mockPrisma = {
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    userRole: {
      create: jest.fn(),
    },
    orgInvitation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  };

  const mockTenantContext = {
    getTenantId: jest.fn().mockReturnValue('tenant-1'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TenantContextService, useValue: mockTenantContext },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    jest.clearAllMocks();
    mockTenantContext.getTenantId.mockReturnValue('tenant-1');
  });

  describe('getCurrentOrganization', () => {
    it('should return current organization', async () => {
      const org = { id: 'tenant-1', name: 'Test Org' };
      mockPrisma.organization.findUnique.mockResolvedValue(org);

      const result = await service.getCurrentOrganization();

      expect(result).toEqual(org);
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
      });
    });
  });

  describe('updateOrganization', () => {
    it('should update organization name', async () => {
      const updated = { id: 'tenant-1', name: 'New Name' };
      mockPrisma.organization.update.mockResolvedValue(updated);

      const result = await service.updateOrganization({ name: 'New Name' });

      expect(result).toEqual(updated);
    });

    it('should not update if name is not provided', async () => {
      mockPrisma.organization.update.mockResolvedValue({ id: 'tenant-1' });

      await service.updateOrganization({});

      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: {},
      });
    });
  });

  describe('updateLogo', () => {
    const mockFile = {
      originalname: 'logo.png',
      buffer: Buffer.from('image-data'),
    } as Express.Multer.File;

    beforeEach(() => {
      jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
      jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
      jest.spyOn(fs.promises, 'unlink').mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should upload logo successfully', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'tenant-1', logoUrl: null });
      mockPrisma.organization.update.mockResolvedValue({ id: 'tenant-1', logoUrl: '/uploads/logos/mock-uuid.png' });

      const result = await service.updateLogo(mockFile);

      expect(result.logoUrl).toContain('mock-uuid.png');
      expect(fs.promises.mkdir).toHaveBeenCalled();
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    it('should clean up old logo file', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'tenant-1', logoUrl: '/uploads/logos/old.png' });
      mockPrisma.organization.update.mockResolvedValue({ id: 'tenant-1', logoUrl: '/uploads/logos/mock-uuid.png' });

      await service.updateLogo(mockFile);

      expect(fs.promises.unlink).toHaveBeenCalled();
    });

    it('should not fail if old logo cleanup fails', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'tenant-1', logoUrl: '/uploads/logos/old.png' });
      mockPrisma.organization.update.mockResolvedValue({ id: 'tenant-1' });
      (fs.promises.unlink as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      await expect(service.updateLogo(mockFile)).resolves.toBeDefined();
    });

    it('should throw BadRequestException for invalid file type', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'tenant-1' });
      const svgFile = { originalname: 'logo.svg', buffer: Buffer.from('') } as Express.Multer.File;

      await expect(service.updateLogo(svgFile)).rejects.toThrow(BadRequestException);
    });

    it('should accept jpg files', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'tenant-1', logoUrl: null });
      mockPrisma.organization.update.mockResolvedValue({ id: 'tenant-1' });
      const jpgFile = { originalname: 'logo.jpg', buffer: Buffer.from('') } as Express.Multer.File;

      await expect(service.updateLogo(jpgFile)).resolves.toBeDefined();
    });

    it('should accept webp files', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'tenant-1', logoUrl: null });
      mockPrisma.organization.update.mockResolvedValue({ id: 'tenant-1' });
      const webpFile = { originalname: 'logo.webp', buffer: Buffer.from('') } as Express.Multer.File;

      await expect(service.updateLogo(webpFile)).resolves.toBeDefined();
    });
  });

  describe('deleteLogo', () => {
    beforeEach(() => {
      jest.spyOn(fs.promises, 'unlink').mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should delete logo and set logoUrl to null', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'tenant-1', logoUrl: '/uploads/logos/old.png' });
      mockPrisma.organization.update.mockResolvedValue({ id: 'tenant-1', logoUrl: null });

      const result = await service.deleteLogo();

      expect(result.logoUrl).toBeNull();
      expect(fs.promises.unlink).toHaveBeenCalled();
    });

    it('should handle missing logo gracefully', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'tenant-1', logoUrl: null });
      mockPrisma.organization.update.mockResolvedValue({ id: 'tenant-1', logoUrl: null });

      const result = await service.deleteLogo();

      expect(result.logoUrl).toBeNull();
    });

    it('should not fail if file deletion fails', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'tenant-1', logoUrl: '/uploads/logos/old.png' });
      mockPrisma.organization.update.mockResolvedValue({ id: 'tenant-1', logoUrl: null });
      (fs.promises.unlink as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      await expect(service.deleteLogo()).resolves.toBeDefined();
    });
  });

  describe('createInvitation', () => {
    const dto = { email: 'invite@test.com', roleName: 'EMPLOYEE' };

    it('should create an invitation successfully', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.orgInvitation.findFirst.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'r1', name: 'EMPLOYEE' });
      mockPrisma.orgInvitation.create.mockResolvedValue({
        id: 'inv-1',
        email: 'invite@test.com',
        organization: { name: 'Test Org' },
      });

      const result = await service.createInvitation(dto, 'user-1');

      expect(result.token).toBeDefined();
      expect(mockPrisma.orgInvitation.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1' });

      await expect(service.createInvitation(dto, 'user-1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if pending invitation exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.orgInvitation.findFirst.mockResolvedValue({ id: 'inv-existing' });

      await expect(service.createInvitation(dto, 'user-1')).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if role not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.orgInvitation.findFirst.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue(null);

      await expect(service.createInvitation(dto, 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('listInvitations', () => {
    it('should return invitations for current org', async () => {
      const invitations = [{ id: 'inv-1', email: 'a@b.com' }];
      mockPrisma.orgInvitation.findMany.mockResolvedValue(invitations);

      const result = await service.listInvitations();

      expect(result).toEqual(invitations);
      expect(mockPrisma.orgInvitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'tenant-1' },
        }),
      );
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke an invitation', async () => {
      mockPrisma.orgInvitation.findFirst.mockResolvedValue({ id: 'inv-1' });
      mockPrisma.orgInvitation.delete.mockResolvedValue({});

      const result = await service.revokeInvitation('inv-1');

      expect(result).toEqual({ message: 'Invitation revoked' });
    });

    it('should throw NotFoundException when invitation not found', async () => {
      mockPrisma.orgInvitation.findFirst.mockResolvedValue(null);

      await expect(service.revokeInvitation('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('acceptInvitation', () => {
    const acceptDto = {
      token: 'raw-token',
      password: 'Pass@123',
      firstName: 'John',
      lastName: 'Doe',
    };

    const mockInvitation = {
      id: 'inv-1',
      email: 'invite@test.com',
      roleName: 'EMPLOYEE',
      organizationId: 'org-1',
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      organization: { id: 'org-1', name: 'Test Org', slug: 'test-org', logoUrl: null },
    };

    it('should accept invitation and create user', async () => {
      mockPrisma.orgInvitation.findUnique.mockResolvedValue(mockInvitation);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'r1', name: 'EMPLOYEE' });
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'invite@test.com',
        passwordHash: 'hashed',
        firstName: 'John',
        lastName: 'Doe',
      });
      mockPrisma.userRole.create.mockResolvedValue({});
      mockPrisma.orgInvitation.update.mockResolvedValue({});

      const result = await service.acceptInvitation(acceptDto);

      expect(result.message).toContain('successfully');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.roles).toContain('EMPLOYEE');
    });

    it('should throw NotFoundException for invalid token', async () => {
      mockPrisma.orgInvitation.findUnique.mockResolvedValue(null);

      await expect(service.acceptInvitation(acceptDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already accepted invitation', async () => {
      mockPrisma.orgInvitation.findUnique.mockResolvedValue({
        ...mockInvitation,
        acceptedAt: new Date(),
      });

      await expect(service.acceptInvitation(acceptDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired invitation', async () => {
      mockPrisma.orgInvitation.findUnique.mockResolvedValue({
        ...mockInvitation,
        expiresAt: new Date(Date.now() - 86400000),
      });

      await expect(service.acceptInvitation(acceptDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if email already registered', async () => {
      mockPrisma.orgInvitation.findUnique.mockResolvedValue(mockInvitation);
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.acceptInvitation(acceptDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if role not found', async () => {
      mockPrisma.orgInvitation.findUnique.mockResolvedValue(mockInvitation);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.role.findFirst.mockResolvedValue(null);

      await expect(service.acceptInvitation(acceptDto)).rejects.toThrow(BadRequestException);
    });
  });
});
