import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductAsset } from '../productasset/entities/productasset.entity';
import { Asset } from '../assets/entities/asset.entity';
import { Category } from '../category/entities/category.entity';
import { Attribute } from '../attributes/entities/attribute.entity';
import { ProductAttribute } from '../productattribute/entities/productattribute.entity';
import { ImageUploadConfig } from 'src/config/image-upload.config';
import { AssetsService } from '../assets/assets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductAsset,
      Asset,
      Category,
      Attribute,
      ProductAttribute,
    ]),
  ],

  controllers: [ProductController],
  providers: [ProductService, ImageUploadConfig, AssetsService],
})
export class ProductModule {}
