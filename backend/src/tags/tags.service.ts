import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as QRCode from 'qrcode';
import * as bwipjs from 'bwip-js';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate QR code for an asset
   */
  async generateQRCode(assetId: string): Promise<{ qrCode: string; url: string }> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset || asset.deletedAt) {
      throw new NotFoundException('Asset not found');
    }

    // Create URL to asset detail page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const assetUrl = `${frontendUrl}/assets/${asset.id}`;

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(assetUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
    });

    // Update asset with QR code URL
    await this.prisma.asset.update({
      where: { id: assetId },
      data: { qrCodeUrl: qrCodeDataUrl },
    });

    return {
      qrCode: qrCodeDataUrl,
      url: assetUrl,
    };
  }

  /**
   * Generate barcode for an asset
   */
  async generateBarcode(assetId: string): Promise<{ barcode: string; assetTag: string }> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset || asset.deletedAt) {
      throw new NotFoundException('Asset not found');
    }

    try {
      // Generate Code128 barcode
      const barcodeBuffer = await bwipjs.toBuffer({
        bcid: 'code128',
        text: asset.assetTag,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
      });

      // Convert to base64 data URL
      const barcodeDataUrl = `data:image/png;base64,${barcodeBuffer.toString('base64')}`;

      // Update asset with barcode URL
      await this.prisma.asset.update({
        where: { id: assetId },
        data: { barcodeUrl: barcodeDataUrl },
      });

      return {
        barcode: barcodeDataUrl,
        assetTag: asset.assetTag,
      };
    } catch (error) {
      throw new Error(`Failed to generate barcode: ${error.message}`);
    }
  }

  /**
   * Generate both QR code and barcode for an asset
   */
  async generateBothTags(assetId: string) {
    const [qrCodeResult, barcodeResult] = await Promise.all([
      this.generateQRCode(assetId),
      this.generateBarcode(assetId),
    ]);

    return {
      qrCode: qrCodeResult,
      barcode: barcodeResult,
    };
  }

  /**
   * Generate printable label sheet for multiple assets
   */
  async generateLabelSheet(assetIds: string[]): Promise<{ message: string; assetCount: number }> {
    const assets = await this.prisma.asset.findMany({
      where: {
        id: { in: assetIds },
        deletedAt: null,
      },
    });

    if (assets.length === 0) {
      throw new NotFoundException('No valid assets found');
    }

    // Generate tags for all assets
    await Promise.all(
      assets.map((asset) => this.generateBothTags(asset.id))
    );

    return {
      message: 'Label sheet generated successfully',
      assetCount: assets.length,
    };
  }
}
