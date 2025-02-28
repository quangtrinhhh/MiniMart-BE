import { Module } from '@nestjs/common';
import { OrderitemService } from './orderitem.service';
import { OrderitemController } from './orderitem.controller';

@Module({
  controllers: [OrderitemController],
  providers: [OrderitemService],
})
export class OrderitemModule {}
