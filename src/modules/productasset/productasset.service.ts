import { Injectable } from '@nestjs/common';
import { CreateProductassetDto } from './dto/create-productasset.dto';
import { UpdateProductassetDto } from './dto/update-productasset.dto';

@Injectable()
export class ProductassetService {
  create(createProductassetDto: CreateProductassetDto) {
    return 'This action adds a new productasset';
  }

  findAll() {
    return `This action returns all productasset`;
  }

  findOne(id: number) {
    return `This action returns a #${id} productasset`;
  }

  update(id: number, updateProductassetDto: UpdateProductassetDto) {
    return `This action updates a #${id} productasset`;
  }

  remove(id: number) {
    return `This action removes a #${id} productasset`;
  }
}
