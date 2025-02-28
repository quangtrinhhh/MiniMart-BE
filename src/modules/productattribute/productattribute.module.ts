import { Module } from '@nestjs/common';
import { ProductattributeService } from './productattribute.service';
import { ProductattributeController } from './productattribute.controller';

@Module({
  controllers: [ProductattributeController],
  providers: [ProductattributeService],
})
export class ProductattributeModule {}
