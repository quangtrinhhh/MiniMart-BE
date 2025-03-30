// VNPay.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { VNPayService } from './vnpay.service';
import { VNPayController } from './vnpay.controller';
import { CheckoutModule } from '../checkout/checkout.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    forwardRef(() => CheckoutModule),
    forwardRef(() => OrdersModule),
  ],
  controllers: [VNPayController],
  providers: [VNPayService],
  exports: [VNPayService],
})
export class VNPayModule {}
