import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, IsNull, Repository } from 'typeorm';
import slugify from 'slugify';
import aqp from 'api-query-params';
import { ImageUploadService } from 'src/services/image-upload.service';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly imageUploadService: ImageUploadService,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    files: Express.Multer.File[],
  ) {
    if (files) {
      const { link } = await this.imageUploadService.uploadImage(files[0]);
      createCategoryDto.image = link;
    }

    const slug = slugify(createCategoryDto.name, {
      lower: true,
      locale: 'vi',
      remove: /[*+~.()'"!:@]/g,
    });

    // Khởi tạo danh mục mới
    const category = this.categoryRepository.create({
      ...createCategoryDto,
      slug,
    });

    // Nếu có `parentId`, tìm danh mục cha và gán vào
    if (createCategoryDto.parentId) {
      const parentCategory = await this.categoryRepository.findOne({
        where: { id: createCategoryDto.parentId },
      });

      if (!parentCategory) {
        throw new Error('Danh mục cha không tồn tại');
      }

      category.parent = parentCategory;
    }

    const result = await this.categoryRepository.save(category);
    return { result };
  }

  async findAll(query: string, current: number, pageSize: number) {
    const { filter, sort } = aqp(query);
    const skip = (current - 1) * pageSize;
    const where: FindOptionsWhere<Category> = {};

    // 🔍 Tìm kiếm theo nhiều trường
    if (filter?.search) {
      const searchValue = String(filter.search).trim();

      where.name = ILike(`%${searchValue}%`); // Tìm theo tên danh mục

      if (!isNaN(Number(searchValue))) {
        where.id = Number(searchValue); // Tìm theo ID nếu là số hợp lệ
      }

      if (searchValue === 'true' || searchValue === 'false') {
        where.status = searchValue === 'true'; // Lọc theo status (true/false)
      }
    }

    // 🔍 Chỉ lấy danh mục gốc (không có parent)
    if (!filter?.parentId) {
      where.parent = IsNull();
    } else if (!isNaN(Number(filter?.parentId))) {
      where.parent = { id: Number(filter.parentId) };
    }

    // Đếm tổng số danh mục phù hợp
    const totalItems = await this.categoryRepository.count({ where });
    const totalPages = Math.ceil(totalItems / pageSize);

    // Lấy danh sách danh mục gốc kèm danh mục con
    const result = await this.categoryRepository.find({
      where,
      skip,
      take: pageSize,
      order: sort || { created_at: 'DESC' },
      relations: ['children'], // Load danh mục con (Không load parent để tránh lặp)
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
      relations: ['children'],
    });
    if (!category)
      throw new BadRequestException(`Không tìm thấy category có id là : ${id}`);
    return category;
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
    files?: Express.Multer.File[],
  ) {
    // 🔍 Kiểm tra danh mục có tồn tại không trước khi cập nhật
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children'], // Load quan hệ nếu có
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục có ID: ${id}`);
    }

    // 📸 Nếu có file ảnh, upload và cập nhật vào DTO
    if (files?.length) {
      const { link } = await this.imageUploadService.uploadImage(files[0]);
      updateCategoryDto.image = link;
    }

    // 📝 Cập nhật slug nếu name thay đổi
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      updateCategoryDto.slug = slugify(updateCategoryDto.name, { lower: true });
    }

    // 🛠 Tiến hành cập nhật
    await this.categoryRepository.update(id, updateCategoryDto);

    // 🔄 Trả về dữ liệu sau khi cập nhật (kèm quan hệ)
    return await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });
  }

  async remove(id: number) {
    // Tìm danh mục cần xóa
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục có ID: ${id}`);
    }

    // Kiểm tra xem danh mục có danh mục con không
    if (category.children && category.children.length > 0) {
      throw new BadRequestException(
        `Danh mục có danh mục con, vui lòng xóa danh mục con trước!`,
      );
    }

    // Xóa danh mục
    await this.categoryRepository.delete(id);

    return {
      message: `Đã xóa danh mục có ID: ${id}`,
      success: true,
    };
  }

  async getAllParentCategories() {
    const result = await this.categoryRepository.find({
      where: { parent: IsNull() },
      take: 8,
    });
    return { result };
  }
  async getAllChillCategories() {
    const result = await this.categoryRepository.find({
      where: { parent: IsNull() },
      take: 8,
    });
    return { result };
  }
}
