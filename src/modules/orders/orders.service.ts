import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { DataSource, LessThan, Repository } from 'typeorm';
import { OrderItem } from '../orderitem/entities/orderitem.entity';
import { UsersService } from '../users/users.service';
import { CartService } from '../cart/cart.service';
// import { User } from '../users/entities/user.entity';
// import { ProductVariant } from '../product-variant/entities/product-variant.entity';
// import { Product } from '../product/entities/product.entity';
// import { CreateOrderDto } from './dto/create-order.dto';
import { RoleEnum } from 'src/common/enums/role.enum';
import {
  OrderStatus,
  // PaymentMethod,
  PaymentStatus,
} from 'src/common/enums/order-status.enum';
import { ProductService } from '../product/product.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly usersService: UsersService,
    private readonly cartService: CartService,
    private readonly productService: ProductService,
    private readonly dataSource: DataSource,
  ) {}

  async getOrdersByUser(userId: number): Promise<Order[]> {
    return this.orderRepository
      .createQueryBuilder('o') // Đổi alias từ "order" thành "o"
      .leftJoinAndSelect('o.orderItems', 'orderItem')
      .leftJoin('orderItem.product', 'product')
      .leftJoin('orderItem.variant', 'variant')
      .addSelect(['product.id'])
      .addSelect(['variant.id', 'variant.name'])
      .where('o.Users_id = :userId', { userId }) // Sử dụng alias "o"
      .orderBy('o.created_at', 'DESC')
      .getMany();
  }

  async cancelOrder(userId: number, orderId: number): Promise<Order> {
    return await this.dataSource.transaction(async (manager) => {
      // Lấy đơn hàng và khóa bảng Order
      console.log(orderId, userId);

      const order = await manager.findOne(Order, {
        where: { id: orderId, user: { id: userId } },
        relations: ['orderItems', 'orderItems.product'],
        lock: { mode: 'pessimistic_write', tables: ['order'] }, // Chỉ khóa bảng Order
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException('Only pending orders can be canceled');
      }

      // Cập nhật trạng thái đơn hàng
      order.status = OrderStatus.CANCELED;
      order.canceled_at = new Date();
      await manager.save(order);

      // Hoàn lại số lượng hàng tồn kho
      const stockUpdatePromises = order.orderItems.map((item) =>
        this.productService.updateProductStock(item.product.id, item.quantity),
      );
      await Promise.all(stockUpdatePromises);

      // Nếu đơn hàng đã thanh toán, xử lý hoàn tiền (bỏ comment khi cần)
      // if (order.payment_status === PaymentStatus.PAID) {
      //   await this.paymentService.refund(order);
      // }

      return order;
    });
  }

  async updateOrderStatus(
    userId: number,
    orderId: number,
    newStatus: OrderStatus,
  ): Promise<void> {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new NotFoundException('User không tồn tại');
    if (user.role != RoleEnum.ADMIN)
      throw new NotFoundException('Bạn ko có quyền');
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order không tồn tại');
    }

    // Kiểm tra trạng thái hợp lệ
    if (!this.canChangeStatus(order.status, newStatus)) {
      throw new BadRequestException(
        `Không thể chuyển từ ${order.status} sang ${newStatus}`,
      );
    }

    // Cập nhật trạng thái
    await this.orderRepository.update(orderId, {
      status: newStatus,
      ...(newStatus === OrderStatus.CANCELED && { canceled_at: new Date() }),
    });
  }

  async getAllOrders(userId: number) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }

    const query = this.orderRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.orderItems', 'orderItem')
      .leftJoin('orderItem.product', 'product')
      .leftJoin('orderItem.variant', 'variant')
      .addSelect(['product.id', 'variant.id', 'variant.name'])
      .orderBy('o.created_at', 'DESC');

    // Nếu không phải admin, chỉ lấy đơn hàng của user đó
    if (user.role !== RoleEnum.ADMIN) {
      query.where('o.Users_id = :userId', { userId });
    }

    return query.getMany();
  }
  async getCountOrder() {
    const countOrder = await this.orderRepository.count({
      where: { status: OrderStatus.PENDING },
    });
    return countOrder;
  }

  async getTotalRevenue(): Promise<number> {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'totalRevenue')
      .where('order.status = :status', { status: OrderStatus.DELIVERED })
      .getRawOne<{ totalRevenue: number | null }>();

    return result?.totalRevenue ?? 0;
  }
  // ngay
  async getDailyRevenue(startDate: Date, endDate: Date) {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select("DATE_TRUNC('day', order.completed_at) AS date") // Lấy ngày từ completed_at
      .addSelect('SUM(order.total)', 'totalRevenue')
      .where('order.status = :status', { status: OrderStatus.DELIVERED })
      .andWhere('order.completed_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy("DATE_TRUNC('day', order.completed_at)") // Gom nhóm theo ngày
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; totalRevenue: number }>();

    return result;
  }
  //Tuần
  async getWeeklyRevenue(startDate: Date, endDate: Date) {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select("DATE_TRUNC('week', order.completed_at) AS week") // Lấy tuần
      .addSelect('SUM(order.total)', 'totalRevenue')
      .where('order.status = :status', { status: OrderStatus.DELIVERED })
      .andWhere('order.completed_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy("DATE_TRUNC('week', order.completed_at)") // Gom nhóm theo tuần
      .orderBy('week', 'ASC')
      .getRawMany<{ week: string; totalRevenue: number }>();

    return result;
  }

  // Tháng
  async getMonthlyRevenue(startDate: Date, endDate: Date) {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select("DATE_TRUNC('month', order.completed_at) AS month") // Lấy tháng
      .addSelect('SUM(order.total)', 'totalRevenue')
      .where('order.status = :status', { status: OrderStatus.DELIVERED })
      .andWhere('order.completed_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy("DATE_TRUNC('month', order.completed_at)") // Gom nhóm theo tháng
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string; totalRevenue: number }>();

    return result;
  }
  // Năm
  async getYearlyRevenue(startYear: number, endYear: number) {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select("DATE_TRUNC('year', order.completed_at) AS year") // Lấy năm
      .addSelect('SUM(order.total)', 'totalRevenue')
      .where('order.status = :status', { status: OrderStatus.DELIVERED })
      .andWhere(
        'EXTRACT(YEAR FROM order.completed_at) BETWEEN :startYear AND :endYear',
        { startYear, endYear },
      )
      .groupBy("DATE_TRUNC('year', order.completed_at)") // Gom nhóm theo năm
      .orderBy('year', 'ASC')
      .getRawMany<{ year: string; totalRevenue: number }>();

    return result;
  }

  async getOrderById(orderId: number): Promise<Order | null> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['user', 'orderItems', 'orderItems.variant'], // Load thông tin user
        select: {
          id: true,
          status: true,
          shipping_fee: true,
          shipping_address: true,
          payment_method: true,
          payment_status: true,
          note: true,
          consignee_name: true,
          total: true,
          created_at: true,
          canceled_at: true,
          completed_at: true,
          delivery_at: true,
          user: {
            id: true, // Chỉ lấy user.id
          },
          orderItems: {
            id: true,
            name: true,
            quantity: true,
            price: true,
            image: true,
            variant: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!order) {
        console.error(`❌ Order not found: ${orderId}`);
        return null;
      }

      return order;
    } catch (error: unknown) {
      console.error('❌ Error in getOrderById:', error);
      return null;
    }
  }

  async updateOrderPaymentStatus(orderId: number, status: PaymentStatus) {
    const order = await this.getOrderById(orderId);
    if (!order) return null;

    order.payment_status = status;
    await this.orderRepository.save(order);
  }

  async deleteOrder(orderId: number): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['orderItems'], // Lấy danh sách OrderItem liên quan
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Xóa mềm từng OrderItem trước
    if (order.orderItems.length > 0) {
      await this.orderRepository.manager.remove(order.orderItems);
    }

    // Xóa mềm đơn hàng
    await this.orderRepository.remove(order);
  }

  // Kiểm soát trạng thái hợp lệ
  private canChangeStatus(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELED]: [],
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }

  async autoCancelFailedOrders() {
    const failedOrders = await this.orderRepository.find({
      where: {
        payment_status: PaymentStatus.PROCESSING,
        created_at: LessThan(new Date(Date.now() - 24 * 60 * 60 * 1000)), // 24h trước
      },
    });

    for (const order of failedOrders) {
      order.payment_status = PaymentStatus.CANCELED;
      order.status = OrderStatus.CANCELED;

      // Hoàn lại stock cho sản phẩm
      // Hoàn lại tồn kho cho sản phẩm trong đơn hàng
      for (const item of order.orderItems) {
        await this.productService.updateProductStock(
          item.product.id,
          item.quantity,
        );
      }

      await this.orderRepository.save(order);
      console.log(`🚮 Đã hủy đơn hàng #${order.id} do thanh toán thất bại.`);
    }
  }
}
