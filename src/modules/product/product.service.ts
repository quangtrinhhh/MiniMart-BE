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
import { ProductAttribute } from '../product-attribute/entities/product-attribute.entity';
import { ProductVariant } from '../product-variant/entities/product-variant.entity';
import { ProductVariantValue } from '../product-variant-value/entities/product-variant-value.entity';

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
    @InjectRepository(ProductVariantValue)
    private productVariantValueRepository: Repository<ProductVariantValue>,
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
      const category = await this.categoryRepository.findOneBy({
        id: createProductDto.category_id,
      });
      if (!category) {
        throw new BadRequestException('Không tìm thấy danh mục sản phẩm.');
      }
      const existingProduct = await this.productRepository.findOneBy({
        name: createProductDto.name,
      });
      if (existingProduct) {
        throw new BadRequestException('Tên sản phẩm đã tồn tại.');
      }
      // ✅ Tạo slug sản phẩm
      const slug = slugify(createProductDto.name, { lower: true });

      // ✅ Tạo sản phẩm
      const product = queryRunner.manager.create(Product, {
        ...createProductDto,
        category,
        slug,
      });
      await queryRunner.manager.save(product);
      console.log('✅ Tạo sản phẩm thành công:', product.id);

      // ✅ Xử lý biến thể sản phẩm (ProductVariant)
      if (createProductDto.variants && createProductDto.variants.length > 0) {
        const variants: ProductVariant[] = [];
        for (const variantDto of createProductDto.variants) {
          const variant = queryRunner.manager.create(ProductVariant, {
            ...variantDto,
            product,
          });

          // ✅ Tạo SKU tự động cho từng biến thể
          variant.SKU = this.generateSKU(
            category.id,
            product.id,
            variant.id,
            variant.name,
          );

          await queryRunner.manager.save(variant);
          variants.push(variant);
        }
        console.log('✅ Tạo biến thể sản phẩm thành công.');
      }

      // ✅ Upload ảnh và kiểm tra lỗi
      let assets: Asset[] = [];
      try {
        assets = await this.assetsService.uploadImages(files);
        if (!assets.length) {
          throw new BadRequestException('❌ Không có ảnh nào được tải lên.');
        }
      } catch (error) {
        throw new BadRequestException(`❌ Upload ảnh thất bại: ${error}`);
      }

      // ✅ Tạo liên kết giữa sản phẩm và ảnh
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
      relations: ['category', 'attributes', 'variants', 'variants.values'],
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
      relations: ['category', 'attributes', 'variants', 'variants.values'],
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
    await queryRunner.startTransaction();

    try {
      // ✅ Tìm sản phẩm cùng với quan hệ liên quan
      const product = await queryRunner.manager.findOne(Product, {
        where: { id },
        relations: ['variants', 'variants.values', 'assets', 'assets.asset'],
      });

      if (!product) {
        throw new BadRequestException('Không tìm thấy sản phẩm để update');
      }

      // ✅ Cập nhật thông tin sản phẩm (nếu có tên mới thì cập nhật slug)
      if (updateProductDto.name) {
        updateProductDto.slug = slugify(updateProductDto.name, { lower: true });
      }
      await queryRunner.manager.update(Product, id, updateProductDto);

      // ✅ Xử lý cập nhật biến thể sản phẩm (nếu có)
      if (updateProductDto.variants) {
        for (const variantDto of updateProductDto.variants) {
          const variant = await queryRunner.manager.findOne(ProductVariant, {
            where: { id: variantDto.id },
          });

          if (variant) {
            await queryRunner.manager.update(
              ProductVariant,
              variant.id,
              variantDto,
            );
          }
        }
      }

      // ✅ Xử lý cập nhật ảnh (nếu có)
      if (file) {
        const asset = product.assets[0]?.asset; // Lấy asset hiện tại

        // ✅ Nếu có ảnh cũ thì xóa trước khi cập nhật
        if (asset) {
          await queryRunner.manager.delete(Asset, asset.id);
        }

        // ✅ Upload ảnh mới
        const { link, type, size } =
          await this.imageUploadConfig.uploadImage(file);
        const newAsset = queryRunner.manager.create(Asset, {
          filename: file.originalname,
          path: link,
          type,
          size,
        });
        await queryRunner.manager.save(newAsset);

        // ✅ Cập nhật ProductAsset
        const newProductAsset = queryRunner.manager.create(ProductAsset, {
          product,
          asset: newAsset,
          type: 'gallery',
        });
        await queryRunner.manager.save(newProductAsset);
      }

      // ✅ Commit transaction nếu thành công
      await queryRunner.commitTransaction();

      return await queryRunner.manager.findOne(Product, {
        where: { id },
        relations: ['category', 'attributes', 'variants', 'variants.values'],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
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
        relations: ['variants', 'variants.values', 'assets', 'assets.asset'],
      });

      if (!product) {
        throw new BadRequestException('Không tìm thấy sản phẩm để xóa');
      }

      // ✅ Xóa tất cả ProductVariantValue liên quan trước
      const variantValuesIds = product.variants.flatMap(
        (variant) => variant.values?.map((value) => value.id) || [],
      );
      if (variantValuesIds.length > 0) {
        await queryRunner.manager.delete(ProductVariantValue, variantValuesIds);
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
