import { Injectable } from '@nestjs/common';
import { CreateProductattributeDto } from './dto/create-productattribute.dto';
import { UpdateProductattributeDto } from './dto/update-productattribute.dto';

@Injectable()
export class ProductattributeService {
  create(createProductattributeDto: CreateProductattributeDto) {
    return 'This action adds a new productattribute';
  }

  findAll() {
    return `This action returns all productattribute`;
  }

  findOne(id: number) {
    return `This action returns a #${id} productattribute`;
  }

  update(id: number, updateProductattributeDto: UpdateProductattributeDto) {
    return `This action updates a #${id} productattribute`;
  }

  remove(id: number) {
    return `This action removes a #${id} productattribute`;
  }
}
