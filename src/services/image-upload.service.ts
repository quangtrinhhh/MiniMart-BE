import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import sharp from 'sharp';
import * as crypto from 'crypto';

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

interface responseData {
  link: string;
  id: string;
  type: string;
  width: number;
  height: number;
  size: number;
}

@Injectable()
export class ImageUploadService {
  private readonly CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
  private readonly UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;
  private readonly maxImageSize = 10 * 1024 * 1024; // 10MB
  private readonly cacheTTL = 86400; // 24 hours

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async uploadImage(file: Express.Multer.File): Promise<responseData> {
    this.validateFile(file);

    const fileHash = this.generateHash(file.buffer);
    const cachedResult = await this.getCachedImage(fileHash);
    if (cachedResult) return cachedResult;

    const jpegBuffer = await this.convertToJpeg(file.buffer);
    const cloudinaryResponse = await this.uploadToCloudinary(jpegBuffer);

    const result: responseData = {
      link: cloudinaryResponse.secure_url,
      id: cloudinaryResponse.public_id,
      type: cloudinaryResponse.format,
      width: cloudinaryResponse.width,
      height: cloudinaryResponse.height,
      size: cloudinaryResponse.bytes,
    };

    await this.cacheManager.set(
      fileHash,
      JSON.stringify(result),
      this.cacheTTL,
    );
    return result;
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
  ): Promise<responseData[]> {
    if (!files?.length) {
      throw new BadRequestException('Không có file nào được upload.');
    }

    return Promise.all(files.map((file) => this.uploadImage(file)));
  }

  // ────── Private Utilities ──────

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Không có file nào được upload.');
    }

    if (file.mimetype === 'image/svg+xml') {
      throw new BadRequestException('Không hỗ trợ định dạng SVG.');
    }

    if (file.size > this.maxImageSize) {
      throw new BadRequestException('Kích thước ảnh quá lớn (tối đa 10MB).');
    }
  }

  private generateHash(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  private async getCachedImage(hash: string): Promise<responseData | null> {
    const cached = await this.cacheManager.get<string>(hash);
    if (!cached) return null;

    try {
      const parsed = JSON.parse(cached) as responseData;
      return parsed;
    } catch (error) {
      console.warn('⚠️ Lỗi khi parse cache:', error);
      return null;
    }
  }

  private async convertToJpeg(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer, { animated: true }).jpeg({ quality: 80 }).toBuffer();
  }

  private async uploadToCloudinary(
    buffer: Buffer,
  ): Promise<CloudinaryUploadResponse> {
    const formData = new FormData();
    formData.append('file', buffer, {
      filename: 'image.jpg',
      contentType: 'image/jpeg',
    });
    formData.append('upload_preset', this.UPLOAD_PRESET);

    try {
      const response: AxiosResponse<CloudinaryUploadResponse> =
        await axios.post(this.CLOUDINARY_API_URL, formData, {
          headers: formData.getHeaders(),
          timeout: 10000,
        });

      if (!response.data?.secure_url) {
        throw new InternalServerErrorException(
          'Cloudinary không trả về đường dẫn ảnh.',
        );
      }

      return response.data;
    } catch (error) {
      console.error('❌ Lỗi khi upload lên Cloudinary:', error);
      throw new InternalServerErrorException(
        'Không thể tải ảnh lên Cloudinary.',
      );
    }
  }
}
