import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductAsset } from '../productasset/entities/productasset.entity';
import { Asset } from '../assets/entities/asset.entity';
import { ImageUploadService } from 'src/services/image-upload.service';
import { Category } from '../category/entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductAsset, Asset, Category])],

  controllers: [ProductController],
  providers: [ProductService, ImageUploadService],
})
export class ProductModule {}
