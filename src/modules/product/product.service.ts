import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Asset } from '../assets/entities/asset.entity';
import { ProductAsset } from '../productasset/entities/productasset.entity';
import { DataSource, Repository } from 'typeorm';
import { Category } from '../category/entities/category.entity';
import slugify from 'slugify';
import { UpdateProductDto } from './dto/update-product.dto';
import aqp from 'api-query-params';
import { ImageUploadConfig } from 'src/config/image-upload.config';
import { AssetsService } from '../assets/assets.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product) private productRepository: Repository<Product>,
    @InjectRepository(Asset) private assetRepository: Repository<Asset>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(ProductAsset)
    private productAssetRepository: Repository<ProductAsset>,
    private readonly imageUploadConfig: ImageUploadConfig,
    private readonly assetsService: AssetsService,
    private dataSource: DataSource,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    files: Express.Multer.File[],
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    // Bắt đầu transaction
    await queryRunner.startTransaction();

    try {
      // ✅ Tìm category
      const category = await this.categoryRepository.findOne({
        where: { id: Number(createProductDto.category_id) },
      });
      if (!category) throw new BadRequestException('Không tìm thấy category');

      // ✅ Tạo sản phẩm
      const slug = slugify(createProductDto.name, { lower: true });
      const product = this.productRepository.create({
        ...createProductDto,
        category,
        slug,
        quantity: Number(createProductDto.quantity),
      });
      // Lưu sản phẩm vào database
      await queryRunner.manager.save(Product, product);

      // await this.productRepository.save(product);

      const assets = await this.assetsService.uploadImages(files);

      // ✅ Tạo liên kết giữa sản phẩm và ảnh
      const productAssets = assets.map((asset) =>
        this.productAssetRepository.create({
          product: product,
          asset: asset,
          type: 'gallery', // Hoặc 'thumbnail' nếu cần
        }),
      );
      // await this.productAssetRepository.save(productAssets);
      await queryRunner.manager.save(ProductAsset, productAssets);

      await queryRunner.commitTransaction();

      return {
        product,
        images: assets,
      };
    } catch (error) {
      // Nếu có lỗi, rollback transaction
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Đóng QueryRunner
      await queryRunner.release();
    }
  }

  async findAll(query: string, current = 1, pageSize = 10) {
    const { filter, sort } = aqp(query);

    delete filter.pageSize;
    delete filter.current;

    const orderBy = sort || { created_at: 'DESC' };

    const [products, totalItems] = await this.productRepository.findAndCount({
      where: filter,
      skip: (current - 1) * pageSize,
      take: pageSize,
      order: orderBy,
      relations: ['productAssets.asset'], // Load trực tiếp asset
    });

    const formattedProducts = products.map((product) => {
      const { productAssets, ...productData } = product; // Loại bỏ 'productAssets'
      return {
        ...productData,
        assets: productAssets.map((pa) => pa.asset),
      };
    });

    return {
      result: formattedProducts,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    };
  }

  async findOne(id: number) {
    const product = await this.productRepository.findOne({
      where: { id: Number(id) },
      relations: ['productAssets.asset'], // Load trực tiếp 'asset' từ 'productAssets'
    });

    if (!product) throw new BadGatewayException('Không tìm thấy product');

    const { productAssets, ...productData } = product; // Loại bỏ 'productAssets'
    return {
      ...productData,
      assets: productAssets.map((pa) => pa.asset), // Chỉ giữ 'asset'
    };
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
    file: Express.Multer.File,
  ) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product)
      throw new BadRequestException('Không tìm thấy product để update');

    if (updateProductDto.name) {
      const slug = slugify(updateProductDto.name, { lower: true });
      await this.productRepository.update(id, {
        ...updateProductDto,
        slug,
      });
    }

    // Thực hiện cập nhật
    const result = await this.productRepository.update(id, updateProductDto);
    if (result.affected === 0) {
      throw new BadRequestException('Cập nhật thất bại');
    }
    const assetId = product?.productAssets[0]?.asset.id;
    if (file) {
      const { link, type, size } =
        await this.imageUploadConfig.uploadImage(file);
      await this.assetRepository.update(Number(assetId), {
        filename: file.originalname,
        path: link,
        type,
        size,
      });
    }

    return await this.productRepository.findOne({ where: { id } });
  }

  async remove(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    // Bắt đầu transaction
    await queryRunner.startTransaction();

    try {
      // Sử dụng queryRunner.query() thay cho repository.findOne()
      const product = await queryRunner.manager.findOne(Product, {
        where: { id },
        relations: ['productAssets', 'productAssets.asset'], // Load luôn assets để tránh lỗi
      });

      if (!product) {
        throw new BadRequestException('Không tìm thấy sản phẩm để xóa');
      }

      // Xóa tất cả các bản ghi trong bảng product_asset liên quan đến sản phẩm này
      if (product.productAssets.length > 0) {
        await queryRunner.manager.delete(
          ProductAsset,
          product.productAssets.map((pa) => pa.id),
        );
      }

      // Lấy danh sách assetId của tất cả ảnh sản phẩm
      const assetIds = product.productAssets.map((pa) => pa.asset.id);

      // Xóa toàn bộ ảnh trong bảng assets
      if (assetIds.length > 0) {
        await queryRunner.manager.delete(Asset, assetIds);
      }

      // Xóa sản phẩm
      await queryRunner.manager.delete(Product, id);

      // Commit transaction nếu mọi thứ đều thành công
      await queryRunner.commitTransaction();

      return { message: `Xóa thành công sản phẩm: ${product.name}` };
    } catch (error) {
      // Rollback transaction nếu có lỗi xảy ra
      await queryRunner.rollbackTransaction();
      throw error; // Throw lại lỗi để xử lý ở cấp độ cao hơn (VD: controller)
    } finally {
      // Đóng queryRunner sau khi xong
      await queryRunner.release();
    }
  }
}
