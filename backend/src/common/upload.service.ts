import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as sharp from 'sharp';

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
      this.logger.warn('Cloudinary not configured — avatars will use placeholder URLs');
    }
  }

  async uploadAvatar(buffer: Buffer, userId: string): Promise<string> {
    if (!this.isConfigured) {
      return `https://api.dicebear.com/7.x/initials/svg?seed=${userId}`;
    }

    // Resize and optimise before upload
    const optimised = await sharp(buffer)
      .resize(256, 256, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();

    return new Promise((resolve, reject) => {
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
  }

  async uploadGroupPicture(buffer: Buffer, groupId: string): Promise<string> {
    if (!this.isConfigured) {
      return `https://api.dicebear.com/7.x/shapes/svg?seed=${groupId}`;
    }

    const optimised = await sharp(buffer)
      .resize(256, 256, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();

    return new Promise((resolve, reject) => {
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
