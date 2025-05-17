import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Asset } from '../assets/entities/asset.entity';
import { ProductAsset } from '../productasset/entities/productasset.entity';
import {
  DataSource,
  EntityManager,
  In,
  MoreThan,
  QueryRunner,
  Repository,
} from 'typeorm';
import { Category } from '../category/entities/category.entity';
import slugify from 'slugify';
import {
  UpdateProductAttributeDto,
  UpdateProductDto,
  UpdateProductVariantDto,
} from './dto/update-product.dto';
import aqp from 'api-query-params';
import { AssetsService } from '../assets/assets.service';
import { ProductVariant } from '../product-variant/entities/product-variant.entity';
import { ProductCategory } from '../category/entities/product-category.entity';
import { ImageUploadService } from 'src/services/image-upload.service';
import { CategoryService } from '../category/category.service';
import { RedisService } from '../redis/redis.service';
import { ProductAttribute } from '../product-attribute/entities/product-attribute.entity';
import { ProductFilterDto } from './dto/ProductFilterDto.dto';
import { plainToInstance } from 'class-transformer';
import { ProductDetailDto } from './dto/product.dto';
import { SuggestProductDto } from './dto/suggest-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product) private productRepository: Repository<Product>,
    @InjectRepository(Asset) private assetRepository: Repository<Asset>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(ProductAsset)
    private productAssetRepository: Repository<ProductAsset>,
    @InjectRepository(ProductVariant)
    private productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(ProductCategory)
    private productCategoryRepository: Repository<ProductCategory>,
    @InjectRepository(ProductAttribute)
    private productAttributeRepository: Repository<ProductAttribute>,

    private readonly assetsService: AssetsService,
    private readonly categoryService: CategoryService,
    private readonly imageUploadService: ImageUploadService,

    private readonly redisService: RedisService,
    private dataSource: DataSource,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    files: Express.Multer.File[],
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ✅ Upload ảnh trước khi bắt đầu transaction (tránh rollback do upload lỗi)
      const assets = await this.assetsService.uploadImages(files);
      if (!assets.length) {
        throw new BadRequestException('❌ Không có ảnh nào được tải lên.');
      }

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

      // ✅ Tạo slug & sản phẩm
      const slug = slugify(createProductDto.name, { lower: true });
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

      // ✅ Xử lý biến thể sản phẩm
      if (createProductDto.variants?.length) {
        const variants = createProductDto.variants.map((variantDto) => {
          const variant = queryRunner.manager.create(ProductVariant, {
            ...variantDto,
            product,
          });

          // ✅ Lấy `category_id` từ danh mục đầu tiên hoặc danh mục phù hợp
          variant.SKU = this.generateSKU(
            categories[0]?.id || 0,
            product.id,
            variant.id,
            variant.name,
          );

          return variant;
        });

        await queryRunner.manager.save(variants);
        console.log('✅ Tạo biến thể sản phẩm thành công.');
      }

      // ✅ Tạo liên kết sản phẩm - ảnh
      const productAssets = assets.map((asset) =>
        queryRunner.manager.create(ProductAsset, {
          product,
          asset,
          type: 'gallery',
        }),
      );
      await queryRunner.manager.save(productAssets);
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
  // Cập nhật sản phẩm
  async update(
    id: number,
    updateProductDto: UpdateProductDto,
    files?: Express.Multer.File[],
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await this.getProductOrFail(queryRunner, id);

      const { variants, productCategories, attributes, ...productData } =
        updateProductDto;

      if (productData.name) {
        productData.slug = slugify(productData.name, { lower: true });
      }

      await this.updateProductMainData(queryRunner, product, productData);
      await this.updateProductCategories(
        queryRunner,
        product,
        productCategories,
      );
      const categoryIdForSKU =
        productCategories?.[0] ??
        product.productCategories[0]?.category?.id ??
        0;
      await this.updateProductVariants(
        queryRunner,
        product,
        variants,
        categoryIdForSKU,
      );
      await this.updateProductAttributes(queryRunner, product, attributes);

      await this.updateProductImage(
        queryRunner,
        product,
        files,
        updateProductDto.deletedImageIds,
      );

      await queryRunner.commitTransaction();
      await this.invalidateProductCaches(
        product,
        product.slug,
        product.discount,
      );
      return await queryRunner.manager.findOne(Product, {
        where: { id },
        relations: ['productCategories', 'assets', 'variants', 'attributes'],
      });
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      console.error('❌ Lỗi khi cập nhật sản phẩm:', error);
      throw new BadRequestException(
        `Lỗi khi cập nhật sản phẩm: ${error instanceof Error ? error.message : error}`,
      );
    } finally {
      await queryRunner.release();
    }
  }
  /**
   *
   */
  async findAll(query: string, current = 1, pageSize = 10) {
    const { filter, sort } = aqp(query);

    delete filter.pageSize;
    delete filter.current;

    const orderBy = sort || { created_at: 'DESC' };
    // Tạo key cache duy nhất cho truy vấn này
    const cacheKey = `products:${JSON.stringify(filter)}:${JSON.stringify(orderBy)}:${current}:${pageSize}`;

    // Kiểm tra cache Redis trước khi truy vấn DB
    const cachedResult = await this.redisService.get<unknown>(cacheKey);
    if (cachedResult) {
      console.log('✅ get all Trả về dữ liệu từ cache Redis');

      return cachedResult;
    }
    const [products, totalItems] = await this.productRepository.findAndCount({
      where: filter,
      skip: (current - 1) * pageSize,
      take: pageSize,
      order: orderBy,
      relations: [
        'productCategories',
        'productCategories.category',
        'attributes',
        'variants',
      ],
    });
    // Lưu kết quả vào Redis để tái sử dụng sau
    const result = {
      result: products,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    };
    await this.redisService.set(cacheKey, result, 3600);
    return {
      result,
    };
  }

  async findAllWithFilter(filter: ProductFilterDto): Promise<{
    result: Product[];
    totalItems: number;
    totalPages: number;
  }> {
    const {
      priceRanges = [],
      colors = [],
      categoryIds = [],
      keyword,
      pageSize = 10,
      current = 1,
      sortBy,
    } = filter;
    const cacheKey = `products:filter:${JSON.stringify(filter)}`;
    // Kiểm tra cache Redis trước khi truy vấn DB
    const cachedResult = await this.redisService.get<unknown>(cacheKey);
    if (cachedResult) {
      console.log('✅ Trả về dữ liệu từ cache Redis');
      return cachedResult as {
        result: Product[];
        totalItems: number;
        totalPages: number;
      };
    }
    // Tạo truy vấn
    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.variants', 'variant')
      .leftJoinAndSelect('product.attributes', 'attributes')
      .leftJoinAndSelect('product.productCategories', 'productCategory')
      .leftJoinAndSelect('productCategory.category', 'category')
      .leftJoinAndSelect('product.assets', 'productAsset')
      .leftJoinAndSelect('productAsset.asset', 'asset')
      .where('product.deletedAt IS NULL');

    // Search keyword
    if (keyword?.trim()) {
      qb.andWhere('product.name ILIKE :keyword', {
        keyword: `%${keyword.trim()}%`,
      });
    }

    // Price ranges
    const priceParams: Record<string, number> = {};
    const priceConditions: string[] = [];

    priceRanges.forEach((range, idx) => {
      const [min, max] = range.split('-').map(Number);
      if (!isNaN(min) && !isNaN(max)) {
        priceConditions.push(
          `(product.price BETWEEN :min${idx} AND :max${idx})`,
        );
        priceParams[`min${idx}`] = min;
        priceParams[`max${idx}`] = max;
      }
    });

    if (priceConditions.length > 0 && priceConditions.some((c) => c !== '')) {
      qb.andWhere(`(${priceConditions.join(' OR ')})`, priceParams);
    }

    // Filter by color attributes
    const validColors = colors.filter((c) => c?.trim() !== '');
    if (validColors.length > 0) {
      qb.andWhere(
        `attributes.name = 'color' AND attributes.value IN (:...colors)`,
        { colors: validColors },
      );
    }

    // Filter by categories
    if (categoryIds.length > 0) {
      qb.andWhere(
        `category.id IN (:...categoryIds) OR category.parent IN (:...categoryIds)`,
        { categoryIds },
      );
    }

    const sortMap: Record<string, { field: string; order: 'ASC' | 'DESC' }> = {
      'name:asc': { field: 'product.name', order: 'ASC' },
      'name:desc': { field: 'product.name', order: 'DESC' },
      'price_min:asc': { field: 'product.price', order: 'ASC' },
      'price_min:desc': { field: 'product.price', order: 'DESC' },
      'created_on:asc': { field: 'product.created_at', order: 'ASC' },
      'created_on:desc': { field: 'product.created_at', order: 'DESC' },
    };

    const sortOption = sortMap[sortBy as keyof typeof sortMap] ?? {
      field: 'product.created_at',
      order: 'DESC',
    };
    qb.orderBy(sortOption.field, sortOption.order);

    // Pagination
    const [products, totalItems] = await qb
      .skip((current - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const response = {
      result: products,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    };

    // 4. Ghi dữ liệu vào Redis cache (ví dụ 300 giây = 5 phút)
    await this.redisService.set(cacheKey, response, 300);
    return response;
  }

  // Hàm gợi ý sản phẩm bán chạy nhất hoặc ngẫu nhiên
  async suggestProducts(filter: SuggestProductDto) {
    const { limit } = filter;
    const cacheKey = `products:suggestions:${limit}`;

    // Kiểm tra cache Redis trước
    const cachedResult = await this.redisService.get<Product[]>(cacheKey);
    if (cachedResult) {
      console.log('✅ Trả về dữ liệu từ cache Redis');
      return cachedResult;
    }

    // Lấy sản phẩm bán chạy nhất (dựa trên số lượng bán)
    const popularProducts = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.variants', 'variant')
      .leftJoinAndSelect('product.attributes', 'attributes')
      .leftJoinAndSelect('product.productCategories', 'productCategory')
      .leftJoinAndSelect('productCategory.category', 'category')
      .leftJoinAndSelect('product.assets', 'productAsset')
      .leftJoinAndSelect('productAsset.asset', 'asset')
      .where('product.deletedAt IS NULL')
      .orderBy('product.sold', 'DESC') // Giả sử có trường soldCount để lưu số lượng bán
      .take(limit)
      .getMany();

    let products: Product[];

    if (popularProducts.length > 0) {
      products = popularProducts;
    } else {
      // Nếu không có sản phẩm bán chạy, lấy sản phẩm ngẫu nhiên
      products = await this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.productCategories', 'productCategory')
        .leftJoinAndSelect('product.attributes', 'attributes')
        .where('product.deletedAt IS NULL')
        .orderBy('RANDOM()') // Sắp xếp ngẫu nhiên
        .take(limit)
        .getMany();
    }
    const response = { result: products };
    // Lưu kết quả vào Redis để tối ưu hóa cho các lần yêu cầu sau
    await this.redisService.set(cacheKey, response, 300); // 300 giây = 5 phút

    return response;
  }

  async findOne(slug: string) {
    const cacheKey = `product:${slug}`;

    // 1. Kiểm tra cache Redis
    const cachedProduct = await this.redisService.get(cacheKey);
    if (cachedProduct && typeof cachedProduct === 'string') {
      console.log('✅ Trả về dữ liệu từ cache Redis');
      const parsed = JSON.parse(cachedProduct) as Product;
      return {
        result: plainToInstance(ProductDetailDto, parsed, {
          excludeExtraneousValues: true,
        }),
      };
    }

    // 2. Truy vấn cơ sở dữ liệu
    const product = await this.productRepository.findOne({
      where: { slug },
      relations: [
        'productCategories',
        'productCategories.category',
        'assets',
        'assets.asset',
        'attributes',
        'variants',
      ],
    });

    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    // 3. Biến đổi dữ liệu: productCategories → categories
    const plainProduct = {
      ...product,
      categories: product.productCategories.map((pc) => pc.category),
    };

    // Xóa field không cần thiết trước khi trả về
    delete (plainProduct as Partial<Product>).productCategories;

    // 4. Chuyển sang DTO
    const dto = plainToInstance(ProductDetailDto, plainProduct, {
      excludeExtraneousValues: true,
    });

    // 5. Cache lại dữ liệu dạng thô (không cần cache DTO)
    await this.redisService.set(cacheKey, JSON.stringify(plainProduct), 3600);

    return { result: dto };
  }

  async findOneById(id: number) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: [
        'productCategories',
        'productCategories.category',
        'attributes',
        'variants',
      ],
    });

    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return product;
  }
  async remove(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const product = await queryRunner.manager.findOne(Product, {
        where: { id },
        relations: ['variants', 'assets', 'assets.asset'],
      });

      if (!product) {
        throw new BadRequestException('Không tìm thấy sản phẩm để xóa');
      }

      // ✅ Soft delete các entity con (nếu có soft delete)
      const variantIds = product.variants.map((v) => v.id);
      if (variantIds.length > 0) {
        await queryRunner.manager.softDelete(ProductVariant, variantIds);
      }

      const productAssetIds = product.assets.map((pa) => pa.id);
      if (productAssetIds.length > 0) {
        await queryRunner.manager.softDelete(ProductAsset, productAssetIds);
        const assetIds = product.assets.map((pa) => pa.asset.id);
        if (assetIds.length > 0) {
          await queryRunner.manager.softDelete(Asset, assetIds);
        }
      }

      // ✅ Soft delete sản phẩm chính
      await queryRunner.manager.softDelete(Product, id);

      await this.invalidateProductCaches(product);
      await queryRunner.commitTransaction();

      const cacheKey = `product:${product.slug}`;
      await this.redisService.del(cacheKey);

      const cacheKeys = await this.redisService.scanKeys(`products:*`);
      for (const key of cacheKeys) {
        await this.redisService.del(key);
      }

      return { message: `Ẩn sản phẩm thành công: ${product.name}` };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Lỗi khi ẩn sản phẩm:', error);
      throw new BadRequestException(`Lỗi khi ẩn sản phẩm: ${error}`);
    } finally {
      await queryRunner.release();
    }
  }

  async searchProducts(keyword: string): Promise<Product[]> {
    return this.productRepository
      .createQueryBuilder('product')
      .where(`product.name @@ plainto_tsquery(:keyword)`, { keyword })
      .orWhere('product.name ILIKE :name', { name: `%${keyword}%` })
      .orderBy(
        `ts_rank_cd(product.search_vector, plainto_tsquery(:keyword))`,
        'DESC',
      )
      .limit(10)
      .getMany();
  }
  /***** */
  async getDiscountedProducts(limit = 10) {
    const cacheKey = `discounted-products:limit:${limit}`;
    const cached = await this.redisService.get<{ result: any[] }>(cacheKey);
    if (cached) return cached;

    const discountedProducts = await this.productRepository.find({
      where: { discount: MoreThan(0), deletedAt: undefined },
      order: { discount: 'DESC' },
      take: limit,
      relations: ['variants'],
    });

    const result = { result: discountedProducts };
    await this.redisService.set(cacheKey, result, 60 * 5); // TTL: 5 phút

    return result;
  }

  async getProductsByCategory(categoryId: number) {
    // Lấy danh sách category con nếu categoryId là cha
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['children'],
    });

    // Nếu danh mục cha không có con, trả về rỗng
    if (!category || category.children.length === 0) {
      return { result: [] };
    }

    // Lấy danh sách ID của danh mục con
    const categoryIds = category.children.map((child) => child.id);

    // Lấy tất cả danh mục con cùng với sản phẩm của chúng
    const categoriesWithProducts = await this.categoryRepository.find({
      where: { id: In(categoryIds) }, // Chỉ lấy danh mục con
      relations: [
        'productCategories',
        'productCategories.product',
        'productCategories.product.assets',
        'productCategories.product.variants',
      ],
    });

    // Định dạng dữ liệu đầu ra
    const result = categoriesWithProducts.map((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      products: category.productCategories.map((pc) => ({
        ...pc,
      })),
    }));

    return { result };
  }

  async getRelatedProducts(
    productId: number,
    limit: number = 4,
  ): Promise<{ result: Product[] }> {
    const productCategories = await this.productCategoryRepository.find({
      where: { product: { id: productId } },
      relations: ['category'],
    });

    if (!productCategories.length) {
      return { result: [] };
    }

    const categoryIds = productCategories.map((pc) => pc.category.id);

    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.productCategories', 'pc')
      .leftJoinAndSelect('pc.category', 'category')
      .leftJoinAndSelect('product.assets', 'assets')
      .leftJoinAndSelect('assets.asset', 'asset')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoinAndSelect('product.attributes', 'attributes')
      .where('pc.category_id IN (:...categoryIds)', { categoryIds })
      .andWhere('product.id != :productId', { productId })
      .andWhere('product.status = true')
      .orderBy('RANDOM()')
      .limit(limit)
      .getMany();

    return { result: products };
  }

  // Cập nhật tồn kho của sản phẩm
  async updateProductStock(productId: number, quantity: number): Promise<void> {
    console.log(
      `Called updateProductStock with productId=${productId}, quantity=${quantity}`,
    );

    await this.dataSource.transaction(async (manager: EntityManager) => {
      const product = await manager.findOne(Product, {
        where: { id: productId },
        relations: ['variants'],
      });

      if (!product) {
        throw new Error(`Product with ID ${productId} not found.`);
      }

      // Đảm bảo không bị âm kho
      if (product.stock + quantity < 0) {
        throw new Error(`Insufficient stock for product ${productId}`);
      }

      // Cập nhật stock và sold
      product.stock += quantity;
      product.sold = Math.max(0, product.sold - Math.abs(quantity));
      await manager.save(product);
      console.log(
        `Updated main product stock: ${product.stock}, sold: ${product.sold}`,
      );

      // Cập nhật kho các biến thể (nếu có)
      if (Array.isArray(product.variants) && product.variants.length > 0) {
        for (const variant of product.variants) {
          if (variant.stock + quantity < 0) {
            throw new Error(`Insufficient stock for variant ${variant.id}`);
          }

          variant.stock += quantity;
          await manager.save(variant);
          console.log(`Updated variant ${variant.id} stock: ${variant.stock}`);
        }
      }

      await this.invalidateProductCaches(product);
      console.log(`Cache invalidated for product ${productId}`);
    });
  }

  //
  async getProductBySlugCategory(slug: string, filter: ProductFilterDto) {
    const category = await this.categoryService.findOneSlug(slug);
    if (!category) {
      throw new BadRequestException('Không tìm thấy danh mục nào.');
    }

    // Inject categoryId vào DTO để tận dụng filter logic chung
    const filterDto: ProductFilterDto = {
      ...filter,
      categoryIds: [category.id],
    };

    const paginatedResult = await this.findAllWithFilter(filterDto);

    return {
      category: category.name,
      ...paginatedResult,
    };
  }

  //
  async invalidateProductCaches(
    product: Product,
    oldSlug?: string,
    oldDiscount?: number,
  ) {
    // 1. Xoá cache chi tiết sản phẩm theo slug
    const slugKey = `product:${oldSlug || product.slug}`;
    await this.redisService.del(slugKey);

    // 2. Xoá tất cả danh sách sản phẩm có thể chứa sản phẩm này
    const listKeys = await this.redisService.scanKeys('products:*');
    for (const key of listKeys) {
      await this.redisService.del(key);
    }

    // 3. Nếu sản phẩm có discount thay đổi, xóa cache giảm giá
    const wasDiscounted = oldDiscount && oldDiscount > 0;
    const isDiscounted = product.discount > 0;

    if (wasDiscounted || isDiscounted) {
      const discountKeys = await this.redisService.scanKeys(
        'discounted-products:*',
      );
      for (const key of discountKeys) {
        await this.redisService.del(key);
      }
    }
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
  //****************** */
  private async getProductOrFail(queryRunner: QueryRunner, id: number) {
    const product = await queryRunner.manager.findOne(Product, {
      where: { id },
      relations: ['productCategories', 'assets', 'variants', 'attributes'],
    });

    if (!product) {
      throw new BadRequestException('Không tìm thấy sản phẩm để update');
    }

    return product;
  }

  private async updateProductMainData(
    queryRunner: QueryRunner,
    product: Product,
    data: Partial<Product>,
  ) {
    const updates: Partial<Product> = {};
    for (const key in data) {
      if (
        Object.prototype.hasOwnProperty.call(data, key) &&
        data[key] !== undefined &&
        product &&
        product[key] !== undefined &&
        data[key] !== product[key]
      ) {
        updates[key] = data[key] as Product[keyof Product];
      }
    }
    if (Object.keys(updates).length > 0) {
      await queryRunner.manager.update(Product, product.id, updates);
    }
  }

  private async updateProductCategories(
    queryRunner: QueryRunner,
    product: Product,
    categoryIds?: number[],
  ) {
    if (!categoryIds) return;

    // Lấy lại categoryId hiện có
    const current = await queryRunner.manager.find(ProductCategory, {
      where: { product: { id: product.id } },
      relations: ['category'],
    });

    const currentIds = current
      .map((pc) => pc.category?.id)
      .filter((id): id is number => typeof id === 'number');

    const toAdd = categoryIds.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter((id) => !categoryIds.includes(id));

    if (toRemove.length > 0) {
      await queryRunner.manager.delete(ProductCategory, {
        product: { id: product.id },
        category: { id: In(toRemove) },
      });
    }

    if (toAdd.length > 0) {
      const newCategories = await queryRunner.manager.findByIds(
        Category,
        toAdd,
      );
      const newRelations = newCategories.map((category) =>
        queryRunner.manager.create(ProductCategory, { product, category }),
      );
      await queryRunner.manager.save(newRelations);
    }
  }

  private async updateProductVariants(
    queryRunner: QueryRunner,
    product: Product,
    variants?: UpdateProductVariantDto[],
    categoryIdForSKU?: number,
  ) {
    if (!variants) return;

    const variantRepo = queryRunner.manager.getRepository(ProductVariant);
    const existingMap = new Map(product.variants.map((v) => [v.id, v]));
    const incomingMap = new Map(
      variants.filter((v) => v.id).map((v) => [v.id!, v]),
    );

    // Xoá các variant không còn trong payload
    const toDelete = product.variants.filter((v) => !incomingMap.has(v.id));
    if (toDelete.length > 0) {
      await variantRepo.delete(toDelete.map((v) => v.id));
    }

    for (const variant of variants) {
      const isExisting = variant.id && existingMap.has(variant.id);

      if (isExisting) {
        const existing = existingMap.get(variant.id!)!;
        const hasChanges = Object.entries(variant).some(
          ([key, value]) =>
            value !== undefined &&
            value !== existing[key as keyof ProductVariant],
        );

        if (hasChanges) {
          await variantRepo.update(variant.id!, {
            ...variant,
            // Giữ lại SKU cũ nếu không truyền mới
            SKU: variant.sku ?? existing.SKU,
          });
        }
      } else {
        // Tạo mới variant
        const newVariant = variantRepo.create({
          ...variant,
          SKU:
            variant.sku ??
            this.generateSKU(
              categoryIdForSKU ?? 0,
              product.id,
              product.variants.length + 1,
              variant.name,
            ),
          product,
        });
        await variantRepo.save(newVariant);
      }
    }
  }
  async updateProductImage(
    queryRunner: QueryRunner,
    product: Product,
    files?: Express.Multer.File[],
    deletedImageIds?: number[],
  ) {
    try {
      if (deletedImageIds && deletedImageIds.length > 0) {
        await queryRunner.manager.delete(ProductAsset, {
          product: { id: product.id },
          asset: { id: In(deletedImageIds) },
        });
        await queryRunner.manager.delete(Asset, deletedImageIds);
      }

      if (files && files.length > 0) {
        for (const file of files) {
          const { link, type, size } =
            await this.imageUploadService.uploadImage(file);

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
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Ném lỗi để hàm gọi bên ngoài xử lý rollback
      throw new InternalServerErrorException('Cập nhật ảnh sản phẩm thất bại');
    }
  }

  private async updateProductAttributes(
    queryRunner: QueryRunner,
    product: Product,
    attributes: UpdateProductAttributeDto[] = [],
  ): Promise<void> {
    const repo = queryRunner.manager.getRepository(ProductAttribute);

    // Lấy danh sách thuộc tính hiện có của sản phẩm (đã được load sẵn)
    const existingAttrs = product.attributes || [];

    // Tạo Map để dễ dàng lookup thuộc tính theo id
    const existingMap = new Map<number, ProductAttribute>(
      existingAttrs
        .filter((attr) => attr.id != null)
        .map((attr) => [attr.id, attr]),
    );

    // Tập hợp id thuộc tính trong dữ liệu mới gửi lên (incoming)
    const incomingIds = new Set<number>(
      attributes
        .filter((attr) => attr.id != null)
        .map((attr) => attr.id as number),
    );

    // 1. Xóa thuộc tính cũ không còn xuất hiện trong dữ liệu mới
    const toRemove = existingAttrs.filter((attr) => !incomingIds.has(attr.id));
    if (toRemove.length > 0) {
      await repo.remove(toRemove);
    }

    // 2. Cập nhật các thuộc tính có id, chỉ khi dữ liệu thay đổi
    for (const attrDto of attributes) {
      if (attrDto.id && existingMap.has(attrDto.id)) {
        const existingAttr = existingMap.get(attrDto.id)!;
        let changed = false;

        if (attrDto.name !== undefined && attrDto.name !== existingAttr.name) {
          existingAttr.name = attrDto.name;
          changed = true;
        }
        if (
          attrDto.value !== undefined &&
          attrDto.value !== existingAttr.value
        ) {
          existingAttr.value = attrDto.value;
          changed = true;
        }

        if (changed) {
          await repo.save(existingAttr);
        }
      }
    }

    // 3. Thêm mới các thuộc tính không có id (mới hoàn toàn)
    const toAdd = attributes.filter((attr) => !attr.id);
    if (toAdd.length > 0) {
      const newEntities = toAdd.map((attrDto) =>
        repo.create({
          product,
          name: attrDto.name,
          value: attrDto.value,
        }),
      );
      await repo.save(newEntities);
    }
  }
}
