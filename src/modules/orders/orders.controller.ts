import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { GetUser } from 'src/decorator/user.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(@GetUser('_id') userId: number) {
    return this.ordersService.createOrder(userId);
  }

  @Get()
  async getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @Delete(':orderId/cancel')
  async cancelOrder(
    @GetUser('_id') userId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.ordersService.cancelOrder(userId, orderId);
  }
}
