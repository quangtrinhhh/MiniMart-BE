import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { AuthModule } from 'src/auth/auth.module';
import { ImageUploadService } from 'src/services/image-upload.service';
import { ProductCategory } from './entities/product-category.entity';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, ProductCategory]),
    AuthModule,
    RedisModule,
  ],
  controllers: [CategoryController],
  providers: [CategoryService, ImageUploadService],
  exports: [CategoryService],
})
export class CategoryModule {}
