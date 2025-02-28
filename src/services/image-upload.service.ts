/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import { Express } from 'express';

@Injectable()
export class ImageUploadService {
  private readonly IMGUR_API_URL = 'https://api.imgur.com/3/upload';
  private readonly IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID || '';

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

    const formData = new FormData();
    formData.append('image', file.buffer, file.originalname);

    try {
      const response: AxiosResponse = await axios.post(
        this.IMGUR_API_URL,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Client-ID ${this.IMGUR_CLIENT_ID}`,
          },
        },
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!response.data || !response.data.data) {
        throw new InternalServerErrorException(
          'Không nhận được phản hồi hợp lệ từ Imgur.',
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const { link, id, type, width, height, size } = response.data.data;

      console.log(`✅ Ảnh đã upload thành công: ${link}`);
      return {
        link,
        id,
        type,
        width: Number(width),
        height: Number(height),
        size: Number(size),
      };
    } catch (error) {
      console.error('❌ Lỗi upload ảnh:', error);

      throw new InternalServerErrorException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.response?.data?.error || 'Không thể tải ảnh lên Imgur',
      );
    }
  }
}
