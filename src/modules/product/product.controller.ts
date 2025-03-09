import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UseInterceptors,
  Query,
  UploadedFiles,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Public } from 'src/decorator/customize';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}
  @Get('/discounted')
  @Public()
  async getDiscountedProducts() {
    return await this.productService.getDiscountedProducts();
  }
  /******************************************************************* */
  @UseInterceptors(FilesInterceptor('images', 5))
  @Post()
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() file: Express.Multer.File[],
  ) {
    return await this.productService.create(createProductDto, file);
  }

  @Get()
  @Public()
  async findAll(
    @Query() query: string,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    return await this.productService.findAll(
      query,
      +current || 1,
      +pageSize || 8,
    );
  }

  @Get(':slug')
  @Public()
  findOne(@Param('slug') slug: string) {
    return this.productService.findOne(slug);
  }

  @UseInterceptors(FileInterceptor('image'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productService.update(+id, updateProductDto, file);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(+id);
  }
}
