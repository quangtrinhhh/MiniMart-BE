import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  // Post,
  Put,
  // Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { GetUser } from 'src/decorator/user.decorator';
// import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from 'src/common/enums/order-status.enum';
// import { Request } from 'express';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}
  @Put(':orderId/status')
  async updateOrderStatus(
    @GetUser('_id') userId: number, // Lấy user từ request (do JwtAuthGuard xử lý)
    @Param('orderId') orderId: number,
    @Body('status') newStatus: OrderStatus,
  ) {
    await this.ordersService.updateOrderStatus(userId, orderId, newStatus);
    return { message: 'Order status updated successfully' };
  }
  // @Post()
  // async createOrder(
  //   @GetUser('_id') userId: number,
  //   @Body() createOrderDto: CreateOrderDto,
  //   @Req() req: Request,
  // ) {
  //   const ipAddr = (
  //     req.headers['x-forwarded-for']?.toString() ||
  //     req.ip ||
  //     req.connection?.remoteAddress ||
  //     '127.0.0.1'
  //   )
  //     .split(',')[0]
  //     .trim();
  //   return this.ordersService.createOrder(userId, createOrderDto, ipAddr);
  // }
  // @Get('/getorder')
  // async getAllOrderAdmin(@GetUser('_id') userId: number) {
  //   return this.ordersService.getAllOrderAdmin(userId);
  // }
  @Get()
  async getAllOrders(@GetUser('_id') userId: number) {
    return this.ordersService.getAllOrders(userId);
  }

  @Put(':orderId/cancel')
  async cancelOrder(
    @GetUser('_id') userId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.ordersService.cancelOrder(userId, orderId);
  }
}
