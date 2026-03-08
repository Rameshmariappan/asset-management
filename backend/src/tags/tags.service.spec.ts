import { Test, TestingModule } from '@nestjs/testing';
import { TagsService } from './tags.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as bwipjs from 'bwip-js';

jest.mock('qrcode');
jest.mock('bwip-js');

describe('TagsService', () => {
  let service: TagsService;

  const mockPrisma = {
    asset: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    jest.clearAllMocks();
  });

  describe('generateQRCode', () => {
    it('should generate QR code and update asset', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({ id: 'a1', assetTag: 'TAG-001', deletedAt: null });
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,qr-data');
      mockPrisma.asset.update.mockResolvedValue({});

      const result = await service.generateQRCode('a1');

      expect(result.qrCode).toContain('data:image/png');
      expect(result.url).toContain('/assets/a1');
      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { qrCodeUrl: expect.any(String) },
        }),
      );
    });

    it('should throw NotFoundException when asset not found', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);

      await expect(service.generateQRCode('x')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when asset is soft-deleted', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({ id: 'a1', deletedAt: new Date() });

      await expect(service.generateQRCode('a1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateBarcode', () => {
    it('should generate barcode and update asset', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({ id: 'a1', assetTag: 'TAG-001', deletedAt: null });
      (bwipjs.toBuffer as jest.Mock).mockResolvedValue(Buffer.from('barcode-data'));
      mockPrisma.asset.update.mockResolvedValue({});

      const result = await service.generateBarcode('a1');

      expect(result.barcode).toContain('data:image/png;base64');
      expect(result.assetTag).toBe('TAG-001');
    });

    it('should throw NotFoundException when asset not found', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);

      await expect(service.generateBarcode('x')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when asset is soft-deleted', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({ id: 'a1', deletedAt: new Date() });

      await expect(service.generateBarcode('a1')).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException when barcode generation fails', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({ id: 'a1', assetTag: 'TAG-001', deletedAt: null });
      (bwipjs.toBuffer as jest.Mock).mockRejectedValue(new Error('Encoding error'));

      await expect(service.generateBarcode('a1')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('generateBothTags', () => {
    it('should generate both QR code and barcode', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({ id: 'a1', assetTag: 'TAG-001', deletedAt: null });
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,qr');
      (bwipjs.toBuffer as jest.Mock).mockResolvedValue(Buffer.from('barcode'));
      mockPrisma.asset.update.mockResolvedValue({});

      const result = await service.generateBothTags('a1');

      expect(result.qrCode).toBeDefined();
      expect(result.barcode).toBeDefined();
    });
  });

  describe('generateLabelSheet', () => {
    it('should generate labels for valid assets', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        { id: 'a1', assetTag: 'TAG-001' },
        { id: 'a2', assetTag: 'TAG-002' },
      ]);
      mockPrisma.asset.findUnique.mockResolvedValue({ id: 'a1', assetTag: 'TAG-001', deletedAt: null });
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,qr');
      (bwipjs.toBuffer as jest.Mock).mockResolvedValue(Buffer.from('barcode'));
      mockPrisma.asset.update.mockResolvedValue({});

      const result = await service.generateLabelSheet(['a1', 'a2']);

      expect(result.message).toContain('successfully');
      expect(result.assetCount).toBe(2);
    });

    it('should throw NotFoundException when no valid assets found', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);

      await expect(service.generateLabelSheet(['x', 'y'])).rejects.toThrow(NotFoundException);
    });
  });
});
