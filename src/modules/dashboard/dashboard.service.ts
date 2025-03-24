import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly usersService: UsersService,
    private readonly ordersService: OrdersService,
  ) {}

  async getDashboardStats() {
    return {
      totalUsers: await this.usersService.countUsers(),
      totalOrders: await this.ordersService.getCountOrder(),
      totalRevenue: await this.ordersService.getTotalRevenue(),
    };
  }
}
