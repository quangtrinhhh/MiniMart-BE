import { Module } from '@nestjs/common';
import { ProductVariantValueService } from './product-variant-value.service';
import { ProductVariantValueController } from './product-variant-value.controller';

@Module({
  controllers: [ProductVariantValueController],
  providers: [ProductVariantValueService],
})
export class ProductVariantValueModule {}
