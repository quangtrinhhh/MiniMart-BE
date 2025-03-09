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
import { DataSource, In, MoreThan, Repository } from 'typeorm';
import { Category } from '../category/entities/category.entity';
import slugify from 'slugify';
import { UpdateProductDto } from './dto/update-product.dto';
import aqp from 'api-query-params';
import { ImageUploadConfig } from 'src/config/image-upload.config';
import { AssetsService } from '../assets/assets.service';
import { ProductAttribute } from '../product-attribute/entities/product-attribute.entity';
import { ProductVariant } from '../product-variant/entities/product-variant.entity';
import { ProductCategory } from '../category/entities/product-category.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product) private productRepository: Repository<Product>,
    @InjectRepository(Asset) private assetRepository: Repository<Asset>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(ProductAsset)
    private productAssetRepository: Repository<ProductAsset>,
    @InjectRepository(ProductAttribute)
    private productAttributeRepository: Repository<ProductAttribute>,
    @InjectRepository(ProductVariant)
    private productVariantRepository: Repository<ProductVariant>,
    private readonly imageUploadConfig: ImageUploadConfig,
    private readonly assetsService: AssetsService,
    private dataSource: DataSource,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    files: Express.Multer.File[],
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      // ✅ Kiểm tra danh mục sản phẩm
      const categories = await this.categoryRepository.findBy({
        id: In(createProductDto.category_ids),
      });
      if (!categories.length) {
        throw new BadRequestException('Không tìm thấy danh mục nào.');
      }

      // ✅ Kiểm tra trùng tên sản phẩm
      const existingProduct = await this.productRepository.findOneBy({
        name: createProductDto.name,
      });
      if (existingProduct) {
        throw new BadRequestException('Tên sản phẩm đã tồn tại.');
      }

      // ✅ Tạo slug sản phẩm
      const slug = slugify(createProductDto.name, { lower: true });

      // ✅ Tạo sản phẩm
      let product = queryRunner.manager.create(Product, {
        ...createProductDto,
        slug,
      });
      product = await queryRunner.manager.save(product);
      console.log('✅ Tạo sản phẩm thành công:', product.id);

      // ✅ Liên kết sản phẩm với nhiều danh mục
      const productCategories = categories.map((category) =>
        queryRunner.manager.create(ProductCategory, { product, category }),
      );
      await queryRunner.manager.save(productCategories);

      // ✅ Xử lý biến thể sản phẩm (ProductVariant)
      if (createProductDto.variants?.length) {
        const variants: ProductVariant[] = [];
        for (const variantDto of createProductDto.variants) {
          const variant = queryRunner.manager.create(ProductVariant, {
            ...variantDto,
            product,
          });

          // ✅ Lấy `category_id` từ danh mục đầu tiên hoặc tự chọn danh mục phù hợp
          variant.SKU = this.generateSKU(
            categories[0]?.id || 0,
            product.id,
            variant.id,
            variant.name,
          );

          await queryRunner.manager.save(variant);
          variants.push(variant);
        }
        console.log('✅ Tạo biến thể sản phẩm thành công.');
      }

      // ✅ Upload ảnh
      let assets: Asset[] = [];
      try {
        assets = await this.assetsService.uploadImages(files);
        if (!assets.length)
          throw new BadRequestException('❌ Không có ảnh nào được tải lên.');
      } catch (error) {
        throw new BadRequestException(`❌ Upload ảnh thất bại: ${error}`);
      }

      // ✅ Tạo liên kết sản phẩm - ảnh
      const productAssets = assets.map((asset) =>
        this.productAssetRepository.create({
          product,
          asset,
          type: 'gallery',
        }),
      );
      await queryRunner.manager.save(ProductAsset, productAssets);
      console.log('🚀 Tạo productAssets thành công.');

      // ✅ Commit giao dịch
      await queryRunner.commitTransaction();
      console.log('✅ Tạo sản phẩm và các thành phần liên quan thành công');

      return { product };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Lỗi khi tạo sản phẩm:', error);
      throw new BadRequestException(`Lỗi khi tạo sản phẩm: ${error}`);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   *
   * @param query
   * @param current
   * @param pageSize
   * @returns
   */
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
      relations: ['productCategories', 'attributes', 'variants'],
    });

    return {
      result: products,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    };
  }

  async findOne(slug: string) {
    const product = await this.productRepository.findOne({
      where: { slug: slug },
      relations: ['productCategories', 'attributes', 'variants'],
    });

    if (!product) throw new BadGatewayException('Không tìm thấy product');

    return {
      result: product,
    };
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
    file?: Express.Multer.File,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      // ✅ Bắt đầu transaction
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // ✅ Tìm sản phẩm
      const product = await queryRunner.manager.findOne(Product, {
        where: { id },
        relations: ['productCategories', 'assets', 'variants'],
      });

      if (!product) {
        throw new BadRequestException('Không tìm thấy sản phẩm để update');
      }

      // ✅ Xử lý thêm danh mục mới mà không xóa danh mục cũ
      if (updateProductDto.category_ids?.length) {
        const categories = await queryRunner.manager.findByIds(
          Category,
          updateProductDto.category_ids, // ✅ Lấy danh mục từ Category, không phải Product
        );

        if (!categories.length) {
          throw new BadRequestException('Không tìm thấy danh mục hợp lệ');
        }

        // Lấy danh mục hiện có của sản phẩm
        const existingProductCategories = await queryRunner.manager.find(
          ProductCategory,
          {
            where: { product: { id } },
            relations: ['category'],
          },
        );

        // Lấy danh sách ID danh mục đã tồn tại
        const existingCategoryIds = existingProductCategories
          .filter((pc) => pc.category) // Tránh lỗi undefined
          .map((pc) => pc.category.id);

        // Lọc ra danh mục mới chưa có
        const newCategories = categories.filter(
          (category) => !existingCategoryIds.includes(category.id),
        );

        // Tạo & lưu danh mục mới
        if (newCategories.length > 0) {
          const newProductCategories = newCategories.map((category) =>
            queryRunner.manager.create(ProductCategory, { product, category }),
          );

          await queryRunner.manager.save(newProductCategories);
        }
      }

      // ✅ Cập nhật thông tin sản phẩm
      if (updateProductDto.name) {
        updateProductDto.slug = slugify(updateProductDto.name, { lower: true });
      }
      await queryRunner.manager.update(Product, id, updateProductDto);

      // ✅ Cập nhật biến thể sản phẩm
      if (updateProductDto.variants) {
        for (const variantDto of updateProductDto.variants) {
          if (variantDto.id) {
            await queryRunner.manager.update(
              ProductVariant,
              variantDto.id,
              variantDto,
            );
          }
        }
      }

      // ✅ Cập nhật ảnh sản phẩm nếu có file mới
      if (file) {
        const existingAsset = product.assets[0]?.asset;
        if (existingAsset) {
          await queryRunner.manager.delete(Asset, existingAsset.id);
        }

        const { link, type, size } =
          await this.imageUploadConfig.uploadImage(file);
        const newAsset = queryRunner.manager.create(Asset, {
          filename: file.originalname,
          path: link,
          type,
          size,
        });
        await queryRunner.manager.save(newAsset);

        const newProductAsset = queryRunner.manager.create(ProductAsset, {
          product,
          asset: newAsset,
          type: 'gallery',
        });
        await queryRunner.manager.save(newProductAsset);
      }

      // ✅ Commit transaction nếu thành công
      await queryRunner.commitTransaction();

      // ✅ Trả về sản phẩm đã cập nhật
      return await queryRunner.manager.findOne(Product, {
        where: { id },
        relations: ['productCategories', 'assets', 'variants'],
      });
    } catch (error) {
      // ❌ Rollback transaction nếu có lỗi
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      console.error('❌ Lỗi khi cập nhật sản phẩm:', error);
      throw new BadRequestException(`Lỗi khi cập nhật sản phẩm: ${error}`);
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      // ✅ Load sản phẩm cùng với tất cả các quan hệ liên quan
      const product = await queryRunner.manager.findOne(Product, {
        where: { id },
        relations: ['variants', 'assets', 'assets.asset'], // ❌ Bỏ 'variants.values'
      });

      if (!product) {
        throw new BadRequestException('Không tìm thấy sản phẩm để xóa');
      }

      // ✅ Xóa tất cả ProductVariant liên quan
      const variantIds = product.variants.map((variant) => variant.id);
      if (variantIds.length > 0) {
        await queryRunner.manager.delete(ProductVariant, variantIds);
      }

      // ✅ Xóa tất cả ProductAsset liên quan
      const productAssetIds = product.assets.map((pa) => pa.id);
      if (productAssetIds.length > 0) {
        await queryRunner.manager.delete(ProductAsset, productAssetIds);

        // ✅ Xóa tất cả Asset liên quan
        const assetIds = product.assets.map((pa) => pa.asset.id);
        if (assetIds.length > 0) {
          await queryRunner.manager.delete(Asset, assetIds);
        }
      }

      // ✅ Xóa sản phẩm chính
      await queryRunner.manager.delete(Product, id);

      // ✅ Commit transaction
      await queryRunner.commitTransaction();

      return { message: `Xóa thành công sản phẩm: ${product.name}` };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Lỗi khi xóa sản phẩm:', error);
      throw new BadRequestException(`Lỗi khi xóa sản phẩm: ${error}`);
    } finally {
      await queryRunner.release();
    }
  }

  async getDiscountedProducts(limit = 10) {
    const discountedProducts = await this.productRepository.find({
      where: { discount: MoreThan(0) },
      order: { discount: 'DESC' },
      take: limit,
    });

    return { result: discountedProducts };
  }
  /**
   * ******************************************************************************
   */

  private generateSKU(
    categoryId: number,
    productId: number,
    variantId?: number,
    variantName?: string, // Thêm tên biến thể
  ): string {
    const categoryCode = String(categoryId).padStart(2, '0'); // Mã danh mục 2 chữ số
    const productCode = String(productId).padStart(4, '0'); // Mã sản phẩm 4 chữ số
    const variantCode = variantId ? String(variantId).padStart(2, '0') : '00'; // Mã biến thể 2 chữ số

    // Xử lý variantName: chuẩn hóa, bỏ dấu, viết hoa
    const variantSlug = variantName
      ? slugify(variantName, { lower: false, strict: true }) // Loại bỏ ký tự đặc biệt
          .replace(/-/g, '') // Bỏ dấu gạch ngang do slugify tạo ra
          .slice(0, 10) // Giới hạn 10 ký tự
          .toUpperCase() // Chuyển thành chữ in hoa
      : 'DEFAULT';

    return `${variantSlug}-${categoryCode}-${productCode}-${variantCode}}`;
  }
}
