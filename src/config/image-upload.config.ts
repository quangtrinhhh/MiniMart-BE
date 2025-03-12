import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import { Express } from 'express';
import sharp from 'sharp';

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
export class ImageUploadConfig {
  private readonly IMGUR_API_URL = 'https://api.imgur.com/3/upload';
  private readonly IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID || '';
  private readonly MAX_IMAGE_SIZE = 100 * 1024 * 1024; // 100MB

  async uploadImage(file: Express.Multer.File): Promise<{
    link: string;
    id: string;
    type: string;
    width: number;
    height: number;
    size: number;
  }> {
    if (!this.IMGUR_CLIENT_ID) {
      throw new InternalServerErrorException(
        'Imgur Client-ID không được cấu hình.',
      );
    }

    if (file.mimetype === 'image/svg+xml') {
      throw new BadRequestException('Không hỗ trợ định dạng SVG.');
    }

    if (file.size > this.MAX_IMAGE_SIZE) {
      throw new BadRequestException('Kích thước tệp vượt quá giới hạn 100MB.');
    }

    try {
      const jpegBuffer = await sharp(file.buffer, { animated: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const formData = new FormData();
      formData.append('image', jpegBuffer, {
        filename: 'converted-image.jpg',
        contentType: 'image/jpeg',
      });

      const response: AxiosResponse<ImgurResponse> = await axios.post(
        this.IMGUR_API_URL,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Client-ID ${this.IMGUR_CLIENT_ID}`,
          },
        },
      );

      if (!response.data || !response.data.data) {
        throw new InternalServerErrorException(
          'Không nhận được phản hồi hợp lệ từ Imgur.',
        );
      }

      const { link, id, type, width, height, size } = response.data.data;

      console.log(`✅ Ảnh đã upload thành công: ${link}`);
      return { link, id, type, width, height, size };
    } catch (error) {
      console.error('❌ Lỗi upload ảnh:', error);
      throw new InternalServerErrorException(
        error || 'Không thể tải ảnh lên Imgur',
      );
    }
  }
}
