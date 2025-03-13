import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductAsset } from '../productasset/entities/productasset.entity';
import { Asset } from '../assets/entities/asset.entity';
import { Category } from '../category/entities/category.entity';

import { AssetsService } from '../assets/assets.service';
import { ProductAttribute } from '../product-attribute/entities/product-attribute.entity';
import { ProductVariant } from '../product-variant/entities/product-variant.entity';
import { ProductCategory } from '../category/entities/product-category.entity';
import { ImageUploadService } from 'src/services/image-upload.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductAsset,
      Asset,
      Category,
      ProductAttribute,
      ProductVariant,
      ProductCategory,
    ]),
  ],

  controllers: [ProductController],
  providers: [ProductService, AssetsService, ImageUploadService],
})
export class ProductModule {}
