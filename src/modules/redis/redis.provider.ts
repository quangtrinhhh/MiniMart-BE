import { Provider } from '@nestjs/common';
import Redis from 'ioredis';

export const RedisProvider: Provider = {
  provide: 'REDIS_CLIENT',
  useFactory: async () => {
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379, // giả lập sai
      retryStrategy: () => null, // không tự retry
    });

    // Bắt lỗi từ sự kiện error
    redis.on('error', (err: Error) => {
      // Định nghĩa kiểu err là Error
      console.error('❌ Redis Error (from event):', err.message);
    });

    try {
      // Kiểm tra kết nối Redis ngay lập tức
      await redis.ping();
      console.log('✅ Connected to Redis');
    } catch (err: unknown) {
      // Định nghĩa err là unknown để an toàn hơn
      if (err instanceof Error) {
        // Kiểm tra xem err có phải là instance của Error không
        console.error('❌ Redis ping failed:', err.message);
      } else {
        console.error('❌ Redis ping failed: Unknown error');
      }
      throw new Error('Redis connection failed');
    }

    // Trả về redis client
    return redis;
  },
};
