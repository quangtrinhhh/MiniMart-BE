import { Module } from '@nestjs/common';
import { ProductassetService } from './productasset.service';
import { ProductassetController } from './productasset.controller';

@Module({
  controllers: [ProductassetController],
  providers: [ProductassetService],
})
export class ProductassetModule {}
