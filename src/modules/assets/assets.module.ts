import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { ImageUploadService } from 'src/services/image-upload.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asset])],
  controllers: [AssetsController],
  providers: [AssetsService, ImageUploadService],
  exports: [AssetsService],
})
export class AssetsModule {}
