/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse, AxiosError } from 'axios';
import FormData from 'form-data'; // Đảm bảo FormData đã được import đúng
import { Express } from 'express'; // Đảm bảo bạn đã cài đặt Express

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
@Injectable()
export class ImageUploadService {
  async uploadImage(
    file: Express.Multer.File,
  ): Promise<{ link: string; id: string }> {
    const formData = new FormData();

    // Append file buffer vào formData
    formData.append('image', file.buffer, file.originalname);

    try {
      const response: AxiosResponse = await axios.post(
        'https://api.imgur.com/3/upload',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`, // Thêm Client-ID nếu cần
          },
        },
      );

      // Trả về cả link và id của ảnh từ Imgur
      const { link, id } = response.data.data;
      console.log('Image uploaded to:', link);

      return { link, id };
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        throw new Error(
          `Image upload failed: ${error.response?.data?.error || error.message}`,
        );
      } else if (error instanceof Error) {
        throw new Error(
          `Có lỗi không xác định trong quá trình tải ảnh lên: ${error.message}`,
        );
      } else {
        throw new Error('Có lỗi không xác định trong quá trình tải ảnh lên');
      }
    }
  }
}
