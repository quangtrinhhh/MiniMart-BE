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
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import slugify from 'slugify';
import aqp from 'api-query-params';
import { ImageUploadConfig } from 'src/config/image-upload.config';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly imageUploadConfig: ImageUploadConfig,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    files: Express.Multer.File[],
  ) {
    if (files) {
      // Nếu có file ảnh, upload ảnh lên và lấy URL

      const { link } = await this.imageUploadConfig.uploadImage(files[0]);
      createCategoryDto.image = link; // Gán URL ảnh vào DTO
    }

    const slug = slugify(createCategoryDto.name, { lower: true });

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      slug,
    });
    const result = await this.categoryRepository.save(category);
    return { result };
  }

  async findAll(query: string, current: number, pageSize: number) {
    const { filter, sort } = aqp(query);

    const skip = (current - 1) * pageSize;
    const where: FindOptionsWhere<Category>[] = [];

    if (filter?.search) {
      const searchValue = String(filter.search).trim(); // 🔄 Chuyển thành string nếu là số

      // 🔍 Tìm theo nhiều trường cùng lúc
      where.push(
        { id: Number(searchValue) || undefined }, // 🔍 Nếu search là số, tìm theo id
        { name: ILike(`%${searchValue}%`) }, // 🔍 Tìm theo name
        { status: searchValue === 'true' }, // 🔍 Tìm theo status (nếu nhập true/false)
      );
    }

    const totalItems = await this.categoryRepository.count({ where });
    const totalPages = Math.ceil(totalItems / pageSize);

    const result = await this.categoryRepository.find({
      where,
      skip,
      take: pageSize,
      order: sort || { created_at: 'DESC' },
    });

    return {
      result,
      totalItems,
      totalPages,
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
    files: Express.Multer.File[],
  ) {
    if (files) {
      // Nếu có file ảnh, upload ảnh lên và lấy URL
      const { link } = await this.imageUploadConfig.uploadImage(files[0]);
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
