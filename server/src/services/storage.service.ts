import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import crypto from 'crypto';
import path from 'path';

export interface StorageUploadResult {
  secureUrl: string;
  publicId: string;
}

export interface IStorageProvider {
  uploadCv(file: Express.Multer.File): Promise<StorageUploadResult>;
  deleteCv(publicId: string): Promise<void>;
  isConfigured(): boolean;
}

/**
 * Default Cloudinary Storage Provider
 */
class CloudinaryStorageProvider implements IStorageProvider {
  private configured: boolean = false;

  constructor() {
    this.init();
  }

  private init(): void {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret && !cloudName.includes('your_') && !apiKey.includes('your_')) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
      });
      this.configured = true;
    } else {
      this.configured = false;
    }
  }

  public isConfigured(): boolean {
    // Recheck in case env vars were set after startup
    if (!this.configured) {
      this.init();
    }
    return this.configured;
  }

  public async uploadCv(file: Express.Multer.File): Promise<StorageUploadResult> {
    const ext = path.extname(file.originalname).toLowerCase().replace(/^\./, '');
    const uniqueId = `cv_${crypto.randomUUID()}`;
    const publicId = `altrium/cv/${uniqueId}`;

    if (!this.isConfigured()) {
      // Safe local/test simulated storage URL when live Cloudinary is not configured
      const simulatedUrl = `https://res.cloudinary.com/altrium-demo/raw/upload/v${Date.now()}/${publicId}.${ext}`;
      return {
        secureUrl: simulatedUrl,
        publicId
      };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'altrium/cv',
          public_id: uniqueId,
          resource_type: 'auto',
          format: ext
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            return reject(new Error(error?.message || 'Failed to upload CV to cloud storage.'));
          }
          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id
          });
        }
      );

      uploadStream.end(file.buffer);
    });
  }

  public async deleteCv(publicId: string): Promise<void> {
    if (!publicId || !publicId.startsWith('altrium/cv/')) {
      // Safety guard: only delete objects belonging to the altrium/cv folder
      return;
    }

    if (!this.isConfigured()) {
      // In simulated/test mode, no-op is safe
      return;
    }

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw', invalidate: true });
    } catch {
      // If raw delete failed, try with image/auto resource type
      try {
        await cloudinary.uploader.destroy(publicId, { invalidate: true });
      } catch (err) {
        console.warn(`[StorageService] Failed to cleanup orphaned CV with publicId: ${publicId}`, err);
      }
    }
  }
}

export class StorageService {
  private static provider: IStorageProvider = new CloudinaryStorageProvider();
  private static deletedPublicIdsForTesting: string[] = [];

  public static setProvider(customProvider: IStorageProvider): void {
    this.provider = customProvider;
  }

  public static resetProvider(): void {
    this.provider = new CloudinaryStorageProvider();
    this.deletedPublicIdsForTesting = [];
  }

  public static isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  public static async uploadCv(file: Express.Multer.File): Promise<StorageUploadResult> {
    return this.provider.uploadCv(file);
  }

  public static async deleteCv(publicId: string): Promise<void> {
    this.deletedPublicIdsForTesting.push(publicId);
    return this.provider.deleteCv(publicId);
  }

  public static getDeletedPublicIdsForTesting(): string[] {
    return [...this.deletedPublicIdsForTesting];
  }
}
