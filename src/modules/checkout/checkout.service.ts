import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cartitem/entities/cartitem.entity';
import { Product } from '../product/entities/product.entity';
import { EntityManager, Repository } from 'typeorm';
import { VNPayService } from '../vnpay/vnpay.service';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from 'src/common/enums/order-status.enum';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CartService } from '../cart/cart.service';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class CheckoutService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    private readonly entityManager: EntityManager,

    @Inject(forwardRef(() => VNPayService))
    private readonly vnpayService: VNPayService,

    private readonly cartService: CartService,

    private readonly emailService: EmailService,

    private readonly userService: UsersService,
    private readonly orderService: OrdersService,
  ) {}

  async checkout(
    userId: number,
    checkoutDto: CreateCheckoutDto,
    ipAddr: string,
  ) {
    return this.entityManager.transaction(
      async (transactionalEntityManager) => {
        const user = await this.userService.findOne(userId);

        // Kiểm tra giỏ hàng
        const cart = await this.cartService.getCartByUserId(userId);
        if (!cart || cart.cartItems.length === 0) {
          throw new BadRequestException('Giỏ hàng trống');
        }

        const calculatedTotal = cart.cartItems.reduce(
          (acc, item) => acc + item.price * item.quantity,
          0,
        );

        // Kiểm tra tổng giá trị
        if (calculatedTotal !== checkoutDto.total) {
          throw new Error('Giá không đúng với BE');
        }

        // Tạo đơn hàng mới và xử lý các sản phẩm trong giỏ hàng
        const order = await this.orderService.createOrderAndItems(
          userId,
          checkoutDto,
          transactionalEntityManager,
        );

        // Xóa giỏ hàng nếu thanh toán COD
        if (checkoutDto.payment_method === PaymentMethod.COD) {
          await transactionalEntityManager.delete(CartItem, {
            cart: { id: cart.id },
          });
          await transactionalEntityManager.delete(Cart, { id: cart.id });

          // Gửi email xác nhận đơn hàng
          await this.emailService.sendOrderConfirmationEmail(
            order, // Đã có order từ createOrderAndItems
            user?.email || '',
          );
        }

        // Xử lý thanh toán qua ngân hàng (VNPAY hoặc các cổng khác)
        if (checkoutDto.payment_method === PaymentMethod.BANK_TRANSFER) {
          return this.vnpayService.createPaymentUrl(
            {
              orderInfo: order.id.toString(),
              amount: Number(order.total + order.shipping_fee),
              orderId: order.id.toString(),
            },
            ipAddr,
          );
        }

        return { order };
      },
    );
  }

  async confirmVnpayPayment(
    orderId: number,
    transactionStatus: string,
    userId: number,
  ) {
    return this.entityManager.transaction(
      async (transactionalEntityManager) => {
        const order = await transactionalEntityManager.findOne(Order, {
          where: { id: Number(orderId) },
          relations: ['orderItems', 'orderItems.product'],
        });
        if (!order) {
          throw new Error('Order not found');
        }
        if (transactionStatus === '00') {
          order.payment_status = PaymentStatus.PAID;
          order.status = OrderStatus.CONFIRMED;
          const cart = await transactionalEntityManager.findOne(Cart, {
            where: { user: { id: userId } },
            relations: ['cartItems'],
          });

          if (cart) {
            await transactionalEntityManager.delete(CartItem, {
              cart: { id: cart.id },
            });
            await transactionalEntityManager.delete(Cart, { id: cart.id });
          }
        } else {
          order.payment_status = PaymentStatus.FAILED;
          for (const orderItem of order.orderItems) {
            if (!orderItem.product) continue;
            const product = await transactionalEntityManager.findOne(Product, {
              where: { id: orderItem.product.id },
            });
            if (product) {
              product.stock += orderItem.quantity;
              await transactionalEntityManager.save(product);
            }
          }
        }
        await transactionalEntityManager.save(order);
        return order;
      },
    );
  }

  async updateOrderStatus(orderId: string, status: PaymentStatus) {
    const order = await this.orderRepository.findOne({
      where: { id: Number(orderId) },
    });
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    order.payment_status = status;
    await this.orderRepository.save(order);
  }
}
