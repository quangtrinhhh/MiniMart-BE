import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ProductattributeService } from './productattribute.service';
import { CreateProductattributeDto } from './dto/create-productattribute.dto';
import { UpdateProductattributeDto } from './dto/update-productattribute.dto';

@Controller('productattribute')
export class ProductattributeController {
  constructor(
    private readonly productattributeService: ProductattributeService,
  ) {}

  @Post()
  create(@Body() createProductattributeDto: CreateProductattributeDto) {
    return this.productattributeService.create(createProductattributeDto);
  }

  @Get()
  findAll() {
    return this.productattributeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productattributeService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductattributeDto: UpdateProductattributeDto,
  ) {
    return this.productattributeService.update(+id, updateProductattributeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productattributeService.remove(+id);
  }
}
