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
  async createOrder(userId: number): Promise<unknown> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ✅ Lấy thông tin user
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });
      if (!user) throw new NotFoundException('User not found');
      // if (!user.address || !user.city || !user.country)
      //   throw new NotFoundException('User address is incomplete');

      // ✅ Lấy giỏ hàng
      const cart = await this.cartService.getCartByUserId(userId);
      if (!cart || !cart.cartItems.length) {
        throw new BadRequestException('Cart is empty');
      }

      // ✅ Tính tổng giá trị đơn hàng
      const total = cart.cartItems.reduce(
        (sum, item) => sum + parseFloat(String(item.price)) * item.quantity,
        0,
      );

      // ✅ Tạo đơn hàng
      let order = queryRunner.manager.create(Order, {
        user,
        status: 'pending',
        shipping_fee: 0,
        total,
      });
      order = await queryRunner.manager.save(order);
      console.log('✅ Tạo đơn hàng thành công:', order.id);

      // ✅ Xử lý từng sản phẩm trong giỏ hàng
      for (const item of cart.cartItems) {
        if (!item.product) {
          throw new NotFoundException(`Product not found`);
        }

        console.log(`🛒 Cart Item:`, item);

        // ✅ Lấy sản phẩm chính (không JOIN variants)
        const product = await queryRunner.manager
          .createQueryBuilder(Product, 'product')
          .where('product.id = :id', { id: item.product.id })
          .setLock('pessimistic_write') // Tránh race condition
          .getOne();

        if (!product) throw new NotFoundException(`Product not found`);

        if (item.variant) {
          // ✅ Lấy biến thể chính xác từ database
          const variant = await queryRunner.manager
            .createQueryBuilder(ProductVariant, 'variant')
            .where('variant.id = :id', { id: item.variant.id })
            .setLock('pessimistic_write')
            .getOne();

          if (!variant) throw new NotFoundException(`Variant not found`);

          console.log(
            `🔥 Variant Before: ${variant.name} - Stock: ${variant.stock}`,
          );

          if (variant.stock < item.quantity) {
            throw new BadRequestException(
              `Variant ${variant.name} is out of stock`,
            );
          }

          // ✅ Trừ stock của biến thể
          variant.stock -= item.quantity;
          await queryRunner.manager.save(variant);

          console.log(
            `✅ Variant After: ${variant.name} - Stock: ${variant.stock}`,
          );

          // ✅ Nếu bạn muốn giảm tổng stock của product theo biến thể
          if (product.stock >= item.quantity) {
            product.stock -= item.quantity;
            await queryRunner.manager.save(product);
          }
        } else {
          console.log(
            `🔥 Product Before: ${product.name} - Stock: ${product.stock}`,
          );

          if (product.stock < item.quantity) {
            throw new BadRequestException(
              `Product ${product.name} is out of stock`,
            );
          }

          // ✅ Trừ stock của sản phẩm chính (chỉ khi không có biến thể)
          product.stock -= item.quantity;
          await queryRunner.manager.save(product);

          console.log(
            `✅ Product After: ${product.name} - Stock: ${product.stock}`,
          );
        }

        // ✅ Tạo OrderItem
        const orderItem = queryRunner.manager.create(OrderItem, {
          order,
          product: item.product,
          variant: item.variant || null, // Nếu có biến thể, lưu lại
          name: item.product.name,
          quantity: item.quantity,
          price: parseFloat(String(item.price)),
        });

        await queryRunner.manager.save(orderItem);
      }

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
        user_id: order.user.id,
      };
    } catch (error) {
      // ❌ Rollback nếu có lỗi
      await queryRunner.rollbackTransaction();
      console.error('❌ Lỗi khi đặt hàng:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new BadRequestException(`Lỗi khi đặt hàng: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async getAllOrders(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: ['user', 'orderItems', 'orderItems.product'],
      order: { created_at: 'DESC' }, // Sắp xếp đơn hàng mới nhất lên đầu
    });
  }

  async cancelOrder(userId: number, orderId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user: { id: userId } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('Only pending orders can be canceled');
    }

    // Cập nhật trạng thái đơn hàng
    order.status = 'canceled';
    order.canceled_at = new Date();

    return await this.orderRepository.save(order);
  }
}
