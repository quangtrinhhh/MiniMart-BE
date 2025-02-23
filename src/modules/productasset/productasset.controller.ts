import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProductassetService } from './productasset.service';
import { CreateProductassetDto } from './dto/create-productasset.dto';
import { UpdateProductassetDto } from './dto/update-productasset.dto';

@Controller('productasset')
export class ProductassetController {
  constructor(private readonly productassetService: ProductassetService) {}

  @Post()
  create(@Body() createProductassetDto: CreateProductassetDto) {
    return this.productassetService.create(createProductassetDto);
  }

  @Get()
  findAll() {
    return this.productassetService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productassetService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductassetDto: UpdateProductassetDto) {
    return this.productassetService.update(+id, updateProductassetDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productassetService.remove(+id);
  }
}
