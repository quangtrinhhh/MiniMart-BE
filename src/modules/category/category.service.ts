import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import slugify from 'slugify';
import { ImageUploadService } from 'src/services/image-upload.service';
import aqp from 'api-query-params';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly imageUploadService: ImageUploadService,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    file: Express.Multer.File,
  ) {
    if (file) {
      // Nếu có file ảnh, upload ảnh lên và lấy URL
      const { link } = await this.imageUploadService.uploadImage(file);
      createCategoryDto.image = link; // Gán URL ảnh vào DTO
    }

    const slug = slugify(createCategoryDto.name, { lower: true });

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      slug,
    });

    return await this.categoryRepository.save(category);
  }

  async findAll(query: string, current: number, pageSize: number) {
    // Parse query nhưng bỏ qua `skip` và `limit` của `aqp`
    const { filter, sort } = aqp(query);
    const totalItems = (await this.categoryRepository.find(filter)).length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const skip = (current - 1) * pageSize;

    delete filter.pageSize;
    delete filter.current;

    const result = await this.categoryRepository.find({
      where: filter,
      skip: skip,
      take: pageSize,
      order: sort || { created_at: 'DESC' },
    });
    return {
      result: result,
      totalItems: totalItems,
      totalPages: totalPages,
    };
  }

  async findOne(id: number) {
    const category = await this.categoryRepository.findOne({
      where: { id: Number(id) },
    });
    if (!category)
      throw new BadRequestException(`Không tìm thấy category có id là : ${id}`);
    return category;
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
    file: Express.Multer.File,
  ) {
    if (file) {
      // Nếu có file ảnh, upload ảnh lên và lấy URL
      const { link } = await this.imageUploadService.uploadImage(file);
      console.log('image:', link);

      updateCategoryDto.image = link; // Gán URL ảnh vào DTO
      console.log('updateCategoryDto.image:', updateCategoryDto.image);
    }

    // Kiểm tra nếu name có tồn tại, tạo slug
    if (updateCategoryDto.name) {
      const slug = slugify(updateCategoryDto.name, { lower: true });
      updateCategoryDto.slug = slug; // Thêm slug vào DTO
    }

    const result = await this.categoryRepository.update(id, updateCategoryDto);

    if (result.affected === 0) {
      throw new NotFoundException('Category not found');
    }

    // Lấy lại dữ liệu category sau khi cập nhật
    const updatedCategory = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!updatedCategory) {
      throw new NotFoundException('Category not found');
    }

    return updatedCategory;
  }

  async remove(id: number) {
    const category = await this.categoryRepository.delete(id);
    if (category.affected === 0)
      throw new BadGatewayException(`Không tìm thấy id`);

    return `This action removes a #${id} category`;
  }
}
