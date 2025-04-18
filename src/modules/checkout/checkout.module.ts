import { forwardRef, Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cartitem/entities/cartitem.entity';
import { OrderItem } from '../orderitem/entities/orderitem.entity';
import { OrdersModule } from '../orders/orders.module';
import { VNPayModule } from '../vnpay/vnpay.module';
import { CartModule } from '../cart/cart.module';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Order, Cart, CartItem, OrderItem]),
    OrdersModule,
    forwardRef(() => VNPayModule),
    CartModule,
    EmailModule,
    UsersModule,
  ],
  providers: [CheckoutService],
  controllers: [CheckoutController],
  exports: [CheckoutService],
})
export class CheckoutModule {}
