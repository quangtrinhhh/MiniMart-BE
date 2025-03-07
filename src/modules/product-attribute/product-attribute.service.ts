import { Injectable } from '@nestjs/common';
import { CreateProductAttributeDto } from './dto/create-product-attribute.dto';
import { UpdateProductAttributeDto } from './dto/update-product-attribute.dto';

@Injectable()
export class ProductAttributeService {
  create(createProductAttributeDto: CreateProductAttributeDto) {
    return 'This action adds a new productAttribute';
  }

  findAll() {
    return `This action returns all productAttribute`;
  }

  findOne(id: number) {
    return `This action returns a #${id} productAttribute`;
  }

  update(id: number, updateProductAttributeDto: UpdateProductAttributeDto) {
    return `This action updates a #${id} productAttribute`;
  }

  remove(id: number) {
    return `This action removes a #${id} productAttribute`;
  }
}
