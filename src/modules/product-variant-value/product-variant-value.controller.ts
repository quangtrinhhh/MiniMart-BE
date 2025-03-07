import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProductVariantValueService } from './product-variant-value.service';
import { CreateProductVariantValueDto } from './dto/create-product-variant-value.dto';
import { UpdateProductVariantValueDto } from './dto/update-product-variant-value.dto';

@Controller('product-variant-value')
export class ProductVariantValueController {
  constructor(private readonly productVariantValueService: ProductVariantValueService) {}

  @Post()
  create(@Body() createProductVariantValueDto: CreateProductVariantValueDto) {
    return this.productVariantValueService.create(createProductVariantValueDto);
  }

  @Get()
  findAll() {
    return this.productVariantValueService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productVariantValueService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductVariantValueDto: UpdateProductVariantValueDto) {
    return this.productVariantValueService.update(+id, updateProductVariantValueDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productVariantValueService.remove(+id);
  }
}
