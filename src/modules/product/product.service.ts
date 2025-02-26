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
import { Repository } from 'typeorm';
import { ImageUploadService } from 'src/services/image-upload.service';
import { Category } from '../category/entities/category.entity';
import slugify from 'slugify';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product) private productRepository: Repository<Product>,
    @InjectRepository(Asset) private assetRepository: Repository<Asset>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(ProductAsset)
    private productAssetRepository: Repository<ProductAsset>,
    private readonly imageUploadService: ImageUploadService,
  ) {}

  async create(createProductDto: CreateProductDto, file: Express.Multer.File) {
    // Tạo sản phẩm từ DTO
    const category = await this.categoryRepository.findOne({
      where: { id: Number(createProductDto.category_id) },
    });
    if (!category) throw new BadRequestException('Không tìm thấy category ');
    const slug = slugify(createProductDto.name, { lower: true });
    const product = this.productRepository.create({
      ...createProductDto,
      category,
      slug,
      quantity: Number(createProductDto.quantity),
      sold: Number(createProductDto.sold),
    });
    await this.productRepository.save(product);
    // Mảng chứa các assets sẽ được lưu vào cơ sở dữ liệu
    const assets: Asset[] = [];

    if (file) {
      // Nếu có file ảnh, upload ảnh lên và lấy URL
      const { link, id, type, size } =
        await this.imageUploadService.uploadImage(file);

      // Tạo đối tượng asset mới từ dữ liệu ảnh
      const asset = this.assetRepository.create({
        filename: id,
        path: link,
        type: type,
        size: size,
      });

      // Thêm asset vào mảng assets
      assets.push(asset);

      // Lưu thông tin ảnh vào cơ sở dữ liệu
      await this.assetRepository.save(asset); // Sửa lại để lưu từng asset thay vì mảng
    }

    // Tạo các mối quan hệ giữa sản phẩm và ảnh
    const productAssets = assets.map((asset) =>
      this.productAssetRepository.create({
        product: product,
        asset: asset,
        type: 'gallery', // Hoặc 'thumbnail' nếu là ảnh đại diện
      }),
    );

    // Lưu các mối quan hệ vào cơ sở dữ liệu
    await this.productAssetRepository.save(productAssets);
    return { productAssets };
  }

  findAll() {
    const repon = this.productRepository.find();
    return repon;
  }

  async findOne(id: number) {
    const Repo = await this.productRepository.findOne({
      where: { id: Number(id) },
    });
    if (!Repo) throw new BadGatewayException('Không tìm thấy product');
    return Repo;
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
        await this.imageUploadService.uploadImage(file);
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
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['productAssets', 'productAssets.asset'], // Load luôn assets để tránh lỗi
    });

    if (!product) {
      throw new BadRequestException('Không tìm thấy product để xóa');
    }

    // Xóa tất cả các bản ghi trong bảng product_asset liên quan đến sản phẩm này
    if (product.productAssets.length > 0) {
      await this.productAssetRepository.delete(product.productAssets[0].id);
    }

    // Lấy danh sách assetId của tất cả ảnh sản phẩm
    const assetIds = product.productAssets.map((pa) => pa.asset.id);

    // Xóa toàn bộ ảnh trong bảng assets
    if (assetIds.length > 0) {
      await this.assetRepository.delete(assetIds);
    }

    // Xóa sản phẩm
    await this.productRepository.delete(id);

    return { message: `Xóa thành công sản phẩm: ${product.name}` };
  }
}
