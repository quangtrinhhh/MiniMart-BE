import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import { Express } from 'express';
import sharp from 'sharp';
import * as crypto from 'crypto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

interface ImgurResponse {
  data: {
    link: string;
    id: string;
    type: string;
    width: number;
    height: number;
    size: number;
  };
  success: boolean;
  status: number;
}

@Injectable()
export class ImageUploadService {
  private readonly IMGUR_API_URL = 'https://api.imgur.com/3/upload';
  private readonly IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID || '';
  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly CACHE_TTL = 86400; // 24 giờ

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {
    if (!this.IMGUR_CLIENT_ID) {
      throw new InternalServerErrorException(
        'Imgur Client-ID chưa được cấu hình.',
      );
    }
  }

  async uploadImage(file: Express.Multer.File): Promise<ImgurResponse['data']> {
    if (!file) {
      throw new BadRequestException('Không có file nào được upload.');
    }

    if (file.mimetype === 'image/svg+xml') {
      throw new BadRequestException('Không hỗ trợ định dạng SVG.');
    }

    if (file.size > this.MAX_IMAGE_SIZE) {
      throw new BadRequestException('Kích thước ảnh quá lớn (tối đa 10MB).');
    }

    // Tạo hash từ file để kiểm tra cache
    const fileHash = crypto.createHash('md5').update(file.buffer).digest('hex');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const cachedImage = (await this.cacheManager.get<string>(fileHash)) ?? null;

    if (cachedImage) {
      try {
        console.log(`✅ Ảnh đã tồn tại trong cache: ${cachedImage}`);
        if (typeof cachedImage === 'string') {
          return JSON.parse(cachedImage) as ImgurResponse['data'];
        }
      } catch (error) {
        console.error('❌ Lỗi parse cache:', error);
      }
    }

    try {
      // Xử lý ảnh bằng sharp
      const jpegBuffer = await sharp(file.buffer, { animated: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Tạo formData để upload
      const formData = new FormData();
      formData.append('image', jpegBuffer, {
        filename: 'converted-image.jpg',
        contentType: 'image/jpeg',
      });

      // Gửi request lên Imgur
      const response: AxiosResponse<ImgurResponse> = await axios.post(
        this.IMGUR_API_URL,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Client-ID ${this.IMGUR_CLIENT_ID}`,
          },
          timeout: 10000, // 10 giây timeout
        },
      );

      if (!response.data || !response.data.data || !response.data.data.link) {
        throw new InternalServerErrorException(
          'Lỗi: Imgur không trả về link ảnh.',
        );
      }

      // Lưu cache
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      await this.cacheManager.set(
        fileHash,
        JSON.stringify(response.data.data),
        this.CACHE_TTL,
      );

      console.log(`✅ Ảnh upload thành công: ${response.data.data.link}`);
      return response.data.data;
    } catch (error) {
      console.error('❌ Lỗi upload ảnh:', error);
      throw new InternalServerErrorException('Không thể tải ảnh lên Imgur.');
    }
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
  ): Promise<ImgurResponse['data'][]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Không có file nào được upload.');
    }

    const uploadTasks = files.map((file) => this.uploadImage(file));

    return await Promise.all(uploadTasks);
  }
}
