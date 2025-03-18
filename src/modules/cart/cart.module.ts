import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/entities/product.entity';
import { CartItem } from '../cartitem/entities/cartitem.entity';
import { User } from '../users/entities/user.entity';
import { Cart } from './entities/cart.entity';
import { ProductVariant } from '../product-variant/entities/product-variant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, CartItem, User, Cart, ProductVariant]),
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
