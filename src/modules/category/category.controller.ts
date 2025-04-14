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
  UseGuards,
  UploadedFiles,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from 'src/auth/passport/roles.guard';
import { Roles } from 'src/decorator/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { Public } from 'src/decorator/customize';

@Controller('category')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get('menu')
  @Public()
  async getCategoryMenu() {
    return this.categoryService.getCategoryMenu();
  }

  @Get('parentcategories')
  @Public()
  async getAllParentCategories() {
    return this.categoryService.getAllParentCategories();
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER) // Chỉ admin mới có thể truy cập
  @Post()
  @UseInterceptors(FilesInterceptor('images', 1))
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFiles() file: Express.Multer.File[],
  ) {
    return this.categoryService.create(createCategoryDto, file);
  }

  @Public()
  @Get()
  findAll(
    @Query() query: string,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.categoryService.findAll(query, +current, +pageSize);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(+id);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images', 1))
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @UploadedFiles() file: Express.Multer.File[],
  ) {
    return this.categoryService.update(+id, updateCategoryDto, file);
  }

  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(+id);
  }
}
