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
import { OrderStatus } from 'src/enums/order-status.enum';
import { CreateOrderDto } from './dto/create-order.dto';

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
          status: OrderStatus.PENDING,
          shipping_fee,
          total: total + (shipping_fee ?? 0),
          shipping_address,
          payment_method,
          note,
          consignee_name:
            consignee_name ?? user.first_name + ' ' + user.last_name,
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
              product: item.product,
              variant: item.variant || null,
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

  async getAllOrders(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: [
        'orderItems',
        'orderItems.product',
        'orderItems.product.assets',
        'orderItems.product.assets.asset',
      ],

      order: { created_at: 'DESC' }, // Sắp xếp đơn hàng mới nhất lên đầu
    });
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
}
