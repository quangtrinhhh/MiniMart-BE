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
import { ApiResponseDto } from 'src/global/globalClass';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @UseInterceptors(FilesInterceptor('images', 5))
  @Post()
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() file: Express.Multer.File[],
  ) {
    try {
      const repon = await this.productService.create(createProductDto, file);
      return new ApiResponseDto('Product created successfully', repon);
    } catch (error) {
      return new ApiResponseDto(
        'Failed to create product',
        null,
        false,
        error.message,
      );
    }
  }

  @Get()
  async findAll(
    @Query() query: string,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    try {
      const repon = await this.productService.findAll(
        query,
        +current || 1,
        +pageSize || 8,
      );
      return new ApiResponseDto('Product findAll successfully', repon);
    } catch (error) {
      return new ApiResponseDto(
        'Failed to findAll product',
        null,
        false,
        error,
      );
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(+id);
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
