import { Test, TestingModule } from '@nestjs/testing';
import { PlatformService } from './platform.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('PlatformService', () => {
  let service: PlatformService;

  const mockPrisma = {
    organization: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PlatformService>(PlatformService);
    jest.clearAllMocks();
  });

  describe('listOrganizations', () => {
    it('should return all organizations', async () => {
      const orgs = [{ id: 'o1', name: 'Org 1', _count: { users: 5 } }];
      mockPrisma.organization.findMany.mockResolvedValue(orgs);

      const result = await service.listOrganizations();

      expect(result).toEqual(orgs);
    });

    it('should filter by search term', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([]);

      await service.listOrganizations({ search: 'test' });

      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'test', mode: 'insensitive' } },
              { slug: { contains: 'test', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should filter by isActive', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([]);

      await service.listOrganizations({ isActive: true });

      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('should filter by both search and isActive', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([]);

      await service.listOrganizations({ search: 'test', isActive: false });

      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
            isActive: false,
          }),
        }),
      );
    });

    it('should handle no params', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([]);

      await service.listOrganizations();

      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  describe('getOrganization', () => {
    it('should return an organization by ID', async () => {
      const org = { id: 'o1', name: 'Org 1', _count: { users: 5 } };
      mockPrisma.organization.findUnique.mockResolvedValue(org);

      const result = await service.getOrganization('o1');

      expect(result).toEqual(org);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.getOrganization('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOrganization', () => {
    it('should update organization', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'o1', name: 'Old' });
      mockPrisma.organization.update.mockResolvedValue({ id: 'o1', name: 'New' });

      const result = await service.updateOrganization('o1', { name: 'New' });

      expect(result.name).toBe('New');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrganization('x', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update isActive flag', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'o1' });
      mockPrisma.organization.update.mockResolvedValue({ id: 'o1', isActive: false });

      const result = await service.updateOrganization('o1', { isActive: false });

      expect(result.isActive).toBe(false);
    });
  });
});
