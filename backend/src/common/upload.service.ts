import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    const cloudName = configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = configService.get<string>('CLOUDINARY_API_SECRET');

    this.isConfigured = !!(cloudName && apiKey && apiSecret);

    if (this.isConfigured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    } else {
      this.logger.warn('Cloudinary not configured — avatars will be stored locally in ./uploads');
    }
  }

  private ensureUploadDir(subfolder: string): string {
    const dir = path.join(process.cwd(), 'uploads', subfolder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private async saveLocally(buffer: Buffer, subfolder: string, filename: string): Promise<string> {
    const dir = this.ensureUploadDir(subfolder);
    const filePath = path.join(dir, filename);
    await fs.promises.writeFile(filePath, buffer);
    return `/api/uploads/${subfolder}/${filename}?v=${Date.now()}`;
  }

  async uploadAvatar(buffer: Buffer, userId: string): Promise<string> {
    // Resize and optimise before upload
    const optimised = await sharp(buffer)
      .resize(256, 256, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();

    if (this.isConfigured) {
      try {
        const url = await new Promise<string>((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                folder: 'interlude/avatars',
                public_id: `avatar_${userId}`,
                overwrite: true,
                resource_type: 'image',
              },
              (error, result: UploadApiResponse | undefined) => {
                if (error) return reject(error);
                if (!result) return reject(new Error('Upload failed'));
                resolve(result.secure_url);
              },
            )
            .end(optimised);
        });
        return url;
      } catch (err) {
        this.logger.error(`Cloudinary avatar upload failed, falling back to local storage: ${(err as Error)?.message}`);
      }
    }

    return this.saveLocally(optimised, 'avatars', `${userId}.webp`);
  }

  async uploadGroupPicture(buffer: Buffer, groupId: string): Promise<string> {
    const optimised = await sharp(buffer)
      .resize(256, 256, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();

    if (this.isConfigured) {
      try {
        const url = await new Promise<string>((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                folder: 'interlude/groups',
                public_id: `group_${groupId}`,
                overwrite: true,
                resource_type: 'image',
              },
              (error, result: UploadApiResponse | undefined) => {
                if (error) return reject(error);
                if (!result) return reject(new Error('Upload failed'));
                resolve(result.secure_url);
              },
            )
            .end(optimised);
        });
        return url;
      } catch (err) {
        this.logger.error(`Cloudinary group image upload failed, falling back to local storage: ${(err as Error)?.message}`);
      }
    }

    return this.saveLocally(optimised, 'groups', `${groupId}.webp`);
  }

  async uploadMessageImage(buffer: Buffer, messageId: string): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Image uploads require Cloudinary configuration');
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: 'interlude/messages',
            public_id: `msg_${messageId}`,
            resource_type: 'image',
          },
          (error, result: UploadApiResponse | undefined) => {
            if (error) return reject(error);
            if (!result) return reject(new Error('Upload failed'));
            resolve(result.secure_url);
          },
        )
        .end(buffer);
    });
  }
}
