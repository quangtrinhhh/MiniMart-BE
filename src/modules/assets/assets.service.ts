import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { Asset } from './entities/asset.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImageUploadService } from 'src/services/image-upload.service';

@Injectable()
export class AssetsService {
  constructor(
    private readonly imageUploadService: ImageUploadService,
    @InjectRepository(Asset) private assetRepository: Repository<Asset>,
  ) {}

  create(createAssetDto: CreateAssetDto) {
    console.log(createAssetDto);

    return 'This action adds a new asset';
  }

  findAll() {
    return `This action returns all assets`;
  }

  findOne(id: number) {
    return `This action returns a #${id} asset`;
  }

  update(id: number, updateAssetDto: UpdateAssetDto) {
    console.log(updateAssetDto);

    return `This action updates a #${id} asset`;
  }

  remove(id: number) {
    return `This action removes a #${id} asset`;
  }

  async uploadImages(files: Express.Multer.File[]): Promise<Asset[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Không có file nào để upload');
    }

    // Upload tất cả ảnh cùng lúc
    const uploadedImages = await Promise.all(
      files.map(async (file) => {
        const { link, type, size } =
          await this.imageUploadService.uploadImage(file);
        return this.assetRepository.create({
          filename: file.originalname,
          path: link,
          type,
          size,
        });
      }),
    );

    // Lưu vào database nếu có ảnh hợp lệ
    if (uploadedImages.length === 0) {
      throw new BadRequestException('Không thể upload ảnh');
    }

    await this.assetRepository.save(uploadedImages);

    return uploadedImages;
  }
}
