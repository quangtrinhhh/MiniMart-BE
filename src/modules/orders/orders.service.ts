import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { DataSource, Repository } from 'typeorm';
import { OrderItem } from '../orderitem/entities/orderitem.entity';
import { UsersService } from '../users/users.service';
import { CartService } from '../cart/cart.service';
import { User } from '../users/entities/user.entity';
import { ProductVariant } from '../product-variant/entities/product-variant.entity';
import { Product } from '../product/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { RoleEnum } from 'src/common/enums/role.enum';
import { OrderStatus } from 'src/common/enums/order-status.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly usersService: UsersService,
    private readonly cartService: CartService,
    private readonly dataSource: DataSource,
  ) {}
  async createOrder(
    userId: number,
    createOrderDto: CreateOrderDto,
  ): Promise<unknown> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const {
        shipping_address,
        payment_method,
        note,
        shipping_fee,
        consignee_name,
      } = createOrderDto;
      // ✅ Lấy thông tin user
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });
      if (!user) throw new NotFoundException('User not found');

      // ✅ Lấy giỏ hàng
      const cart = await this.cartService.getCartByUserId(userId);
      if (!cart || !cart.cartItems.length) {
        throw new BadRequestException('Cart is empty');
      }

      // ✅ Tính tổng giá trị đơn hàng
      const total = cart.cartItems.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
        0,
      );

      // ✅ Tạo đơn hàng
      const order = await queryRunner.manager.save(
        queryRunner.manager.create(Order, {
          user,
          status: OrderStatus.PROCESSING,
          shipping_fee,
          total,
          shipping_address,
          payment_method,
          note,
          consignee_name:
            consignee_name ?? `${user.first_name} ${user.last_name}`,
        }),
      );
      console.log('✅ Tạo đơn hàng thành công:', order.id);

      // ✅ Xử lý từng sản phẩm trong giỏ hàng
      await Promise.all(
        cart.cartItems.map(async (item) => {
          if (!item.product) {
            throw new NotFoundException(`Product not found`);
          }

          console.log(`🛒 Cart Item:`, item);

          // ✅ Lấy sản phẩm chính
          const product = await queryRunner.manager
            .createQueryBuilder(Product, 'product')
            .where('product.id = :id', { id: item.product.id })
            .setLock('pessimistic_write')
            .getOne();

          if (!product) throw new NotFoundException(`Product not found`);

          let variant: ProductVariant | null = null;
          if (item.variant) {
            // ✅ Lấy biến thể chính xác từ database
            variant = await queryRunner.manager
              .createQueryBuilder(ProductVariant, 'variant')
              .where('variant.id = :id', { id: item.variant.id })
              .setLock('pessimistic_write')
              .getOne();

            if (!variant) throw new NotFoundException(`Variant not found`);

            if (variant.stock < item.quantity) {
              throw new BadRequestException(
                `Variant ${variant.name} is out of stock`,
              );
            }

            // ✅ Trừ stock của biến thể
            variant.stock -= item.quantity;
            product.stock -= item.quantity;
          } else {
            if (product.stock < item.quantity) {
              throw new BadRequestException(
                `Product ${product.name} is out of stock`,
              );
            }

            // ✅ Trừ stock của sản phẩm chính
            product.stock -= item.quantity;
          }

          // ✅ Cập nhật sản phẩm
          product.sold += item.quantity;

          await Promise.all([
            queryRunner.manager.save(product),
            variant ? queryRunner.manager.save(variant) : Promise.resolve(),
          ]);

          // ✅ Tạo OrderItem
          await queryRunner.manager.save(
            queryRunner.manager.create(OrderItem, {
              order,
              product,
              ...(variant ? { variant } : {}),
              name: item.product.name,
              quantity: item.quantity,
              price: Number(item.price) || 0,
            }),
          );
        }),
      );

      // ✅ Xóa giỏ hàng
      await this.cartService.clearCart(userId);

      // ✅ Commit transaction
      await queryRunner.commitTransaction();
      console.log('✅ Đặt hàng thành công!');

      return {
        id: order.id,
        status: order.status,
        shipping_fee: order.shipping_fee,
        total: order.total,
        created_at: order.created_at,
        canceled_at: order.canceled_at,
        completed_at: order.completed_at,
        delivery_at: order.delivery_at,
        user: {
          id: order.user.id,
          email: order.user.email,
          phone_number: order.user.phone_number,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Lỗi khi đặt hàng:', error);

      // Kiểm tra nếu error có kiểu Error
      const errorMessage =
        error instanceof Error ? error.message : 'Lỗi không xác định';

      throw new BadRequestException(`Lỗi khi đặt hàng: ${errorMessage}`);
    } finally {
      await queryRunner.release();
    }
  }

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
    const user = await this.usersService.findOne(userId);
    if (!user) throw new NotFoundException('User không tồn tại');

    const order = await this.orderRepository.findOne({
      where: { id: orderId, user: { id: user.id } },
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

    return await this.orderRepository.save(order);
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

  // Kiểm soát trạng thái hợp lệ
  private canChangeStatus(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CANCELED, OrderStatus.PROCESSING],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELED]: [],
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
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
}
