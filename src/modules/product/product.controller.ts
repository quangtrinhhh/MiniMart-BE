import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  Query,
  UploadedFiles,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Public } from 'src/decorator/customize';
import { ProductFilterDto } from './dto/ProductFilterDto.dto';
import { SuggestProductDto } from './dto/suggest-product.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}
  @Get('/discounted')
  @Public()
  async getDiscountedProducts() {
    return await this.productService.getDiscountedProducts();
  }
  @Get('/:id/categorie')
  @Public()
  async getProductsByCategory(@Param('id') categoryId: number) {
    return await this.productService.getProductsByCategory(categoryId);
  }
  @Get('search')
  @Public()
  async searchProducts(@Query('q') keyword: string) {
    return this.productService.searchProducts(keyword);
  }
  @Get('/filter')
  @Public()
  async getProductsByFilter(@Query() filter: ProductFilterDto) {
    console.log(filter);
    return await this.productService.findAllWithFilter(filter);
  }

  @Get('/:id/related')
  @Public()
  async getRelatedProducts(@Param('id') productId: number) {
    return await this.productService.getRelatedProducts(productId);
  }

  @Public()
  @Get('category/:slug')
  async getProductBySlugCategory(
    @Param('slug') slug: string,
    @Query() filter: ProductFilterDto,
  ) {
    return await this.productService.getProductBySlugCategory(slug, filter);
  }

  @Public()
  @Get('suggestions')
  async getSuggestedProducts(@Query() filter: SuggestProductDto) {
    return this.productService.suggestProducts(filter);
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

  @UseInterceptors(FilesInterceptor('images'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles() files: Express.Multer.File[], // nhận nhiều file
  ) {
    console.log(files, updateProductDto);

    return this.productService.update(+id, updateProductDto, files);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(+id);
  }
}
