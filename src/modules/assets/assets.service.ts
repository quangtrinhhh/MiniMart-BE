import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { Asset } from './entities/asset.entity';
import { ImageUploadConfig } from 'src/config/image-upload.config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AssetsService {
  constructor(
    private readonly imageUploadConfig: ImageUploadConfig,
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
    const assets: Asset[] = [];
    for (const file of files) {
      const { link, type, size } =
        await this.imageUploadConfig.uploadImage(file);
      const asset = this.assetRepository.create({
        filename: file.originalname,
        path: link,
        type: type,
        size: size,
      });
      assets.push(asset);
    }
    await this.assetRepository.save(assets);
    if (!assets || assets.length === 0) {
      throw new BadRequestException('Không thể upload ảnh');
    }
    return assets;
  }
}
