import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as sharp from 'sharp';

export type ImagePreset = 'logo' | 'asset' | 'avatar';

const IMAGE_PRESETS: Record<ImagePreset, { maxWidth: number; maxHeight: number; quality: number }> = {
  logo: { maxWidth: 128, maxHeight: 128, quality: 60 },
  asset: { maxWidth: 800, maxHeight: 800, quality: 65 },
  avatar: { maxWidth: 128, maxHeight: 128, quality: 60 },
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private config: ConfigService) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');

    this.bucket = this.config.get<string>('R2_BUCKET_NAME', 'asset-management');
    this.publicUrl = this.config.get<string>('R2_PUBLIC_URL', '');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  /**
   * Upload a file to R2 with automatic compression.
   * Images are resized and converted to WebP.
   */
  async upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder: string,
    preset: ImagePreset = 'asset',
  ): Promise<string> {
    let finalBuffer = buffer;
    let finalMimeType = mimeType;
    let ext = originalName.substring(originalName.lastIndexOf('.'));

    // Compress images using sharp
    if (mimeType.startsWith('image/')) {
      const config = IMAGE_PRESETS[preset];
      finalBuffer = await sharp(buffer)
        .resize(config.maxWidth, config.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: config.quality })
        .toBuffer();
      finalMimeType = 'image/webp';
      ext = '.webp';

      const originalKB = (buffer.length / 1024).toFixed(1);
      const compressedKB = (finalBuffer.length / 1024).toFixed(1);
      this.logger.log(`Compressed: ${originalKB}KB → ${compressedKB}KB (${preset})`);
    }

    const key = `${folder}/${uuidv4()}${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: finalBuffer,
        ContentType: finalMimeType,
      }),
    );

    this.logger.log(`Uploaded: ${key}`);
    return `${this.publicUrl}/${key}`;
  }

  /**
   * Delete a file from R2 by its public URL
   */
  async delete(fileUrl: string): Promise<void> {
    try {
      const key = this.extractKeyFromUrl(fileUrl);
      if (!key) return;

      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      this.logger.log(`Deleted: ${key}`);
    } catch (error) {
      this.logger.warn(`Failed to delete file: ${fileUrl}`, error);
    }
  }

  private extractKeyFromUrl(url: string): string | null {
    if (!url || !this.publicUrl) return null;
    if (url.startsWith(this.publicUrl)) {
      return url.substring(this.publicUrl.length + 1);
    }
    // Legacy local URLs — nothing to delete from R2
    if (url.startsWith('/uploads/')) {
      return null;
    }
    return null;
  }
}
