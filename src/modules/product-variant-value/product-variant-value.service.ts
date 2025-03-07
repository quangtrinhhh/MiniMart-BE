import { Injectable } from '@nestjs/common';
import { CreateProductVariantValueDto } from './dto/create-product-variant-value.dto';
import { UpdateProductVariantValueDto } from './dto/update-product-variant-value.dto';

@Injectable()
export class ProductVariantValueService {
  create(createProductVariantValueDto: CreateProductVariantValueDto) {
    return 'This action adds a new productVariantValue';
  }

  findAll() {
    return `This action returns all productVariantValue`;
  }

  findOne(id: number) {
    return `This action returns a #${id} productVariantValue`;
  }

  update(id: number, updateProductVariantValueDto: UpdateProductVariantValueDto) {
    return `This action updates a #${id} productVariantValue`;
  }

  remove(id: number) {
    return `This action removes a #${id} productVariantValue`;
  }
}
