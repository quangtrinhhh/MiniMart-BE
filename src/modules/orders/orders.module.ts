import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from '../orderitem/entities/orderitem.entity';
import { UsersModule } from '../users/users.module';
import { CartModule } from '../cart/cart.module';
import { Product } from '../product/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { ProductVariant } from '../product-variant/entities/product-variant.entity';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, User, ProductVariant]),
    UsersModule,
    CartModule,
    ProductModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
