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
import { OrderItem } from '../orderitem/entities/orderitem.entity';
import { Product } from '../product/entities/product.entity';
import { EntityManager, Repository } from 'typeorm';
import { VNPayService } from '../vnpay/vnpay.service';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from 'src/common/enums/order-status.enum';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Injectable()
export class CheckoutService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly entityManager: EntityManager,

    @Inject(forwardRef(() => VNPayService))
    private readonly vnpayService: VNPayService,
  ) {}

  async checkout(
    userId: number,
    checkoutDto: CreateCheckoutDto,
    ipAddr: string,
  ) {
    return this.entityManager.transaction(
      async (transactionalEntityManager) => {
        const existingOrder = await this.orderRepository.findOne({
          where: { user: { id: userId }, status: OrderStatus.PENDING },
        });
        if (existingOrder) {
          throw new BadRequestException(
            'Bạn đã có đơn hàng đang chờ xử lý. Vui lòng hoàn tất hoặc hủy đơn hàng trước khi đặt đơn hàng mới.',
          );
        }

        const cart = await this.cartRepository.findOne({
          where: { user: { id: userId } },
          relations: ['cartItems', 'cartItems.product'],
        });
        if (!cart || cart.cartItems.length === 0) {
          throw new BadRequestException('Cart is empty');
        }

        const order = this.orderRepository.create({
          user: { id: userId },
          status: OrderStatus.PENDING,
          payment_method: checkoutDto.payment_method,
          payment_status: PaymentStatus.PENDING,
          shipping_address: checkoutDto.shipping_address,
          shipping_fee: checkoutDto.shipping_fee,
          consignee_name: checkoutDto.consignee_name,
          note: checkoutDto.note,
          total: cart.cartItems.reduce(
            (acc, item) => acc + item.price * item.quantity,
            0,
          ),
        });

        const savedOrder = await transactionalEntityManager.save(order);

        for (const item of cart.cartItems) {
          if (!item.product) {
            throw new Error(`Invalid cart item: product is missing`);
          }

          const product = await transactionalEntityManager.findOne(Product, {
            where: { id: item.product.id },
          });
          if (product && product.stock >= item.quantity) {
            product.stock -= item.quantity;
            await transactionalEntityManager.save(product);
          } else {
            throw new BadRequestException(
              `Not enough stock for product ${product?.name}`,
            );
          }
          const variant =
            item.product.variants?.find((v) => v.id === item.variant?.id) ??
            null;

          const orderItem = this.orderItemRepository.create({
            order: savedOrder,
            product,
            quantity: item.quantity,
            price: item.price,
            name: item.product.name,
            ...(variant ? { variant } : {}), // Chỉ thêm nếu variant tồn tại
          });
          await transactionalEntityManager.save(orderItem);
        }

        if (checkoutDto.payment_method === PaymentMethod.COD) {
          await transactionalEntityManager.delete(CartItem, {
            cart: { id: cart.id },
          });
          await transactionalEntityManager.delete(Cart, { id: cart.id });
        }

        if (checkoutDto.payment_method === PaymentMethod.BANK_TRANSFER) {
          console.log('>>>>>>>>>>>>>>>>>>>>>>');
          console.log('savedOrder.total: ', savedOrder.total);
          console.log('IP Address:', ipAddr);

          return this.vnpayService.createPaymentUrl(
            {
              orderInfo: savedOrder.id.toString(),
              amount: Number(savedOrder.total + savedOrder.shipping_fee),
              orderId: savedOrder.id.toString(),
            },
            ipAddr,
          );
        }

        return { message: 'Order placed successfully', order: savedOrder };
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
