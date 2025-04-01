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
import { CartService } from '../cart/cart.service';

@Injectable()
export class CheckoutService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    private readonly entityManager: EntityManager,

    @Inject(forwardRef(() => VNPayService))
    private readonly vnpayService: VNPayService,

    private readonly cartService: CartService,
  ) {}

  async checkout(
    userId: number,
    checkoutDto: CreateCheckoutDto,
    ipAddr: string,
  ) {
    return this.entityManager.transaction(
      async (transactionalEntityManager) => {
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

        // Tạo đơn hàng mới
        const order = this.orderRepository.create({
          user: { id: userId },
          status: OrderStatus.PROCESSING,
          payment_method: checkoutDto.payment_method,
          payment_status: PaymentStatus.PROCESSING,
          shipping_address: checkoutDto.shipping_address,
          shipping_fee: checkoutDto.shipping_fee,
          consignee_name: checkoutDto.consignee_name,
          note: checkoutDto.note,
          total: calculatedTotal,
        });

        const savedOrder = await transactionalEntityManager.save(order);

        // Xử lý từng sản phẩm trong giỏ hàng
        for (const item of cart.cartItems) {
          if (!item.product) {
            throw new BadRequestException(
              `Mặt hàng trong giỏ hàng không hợp lệ: sản phẩm bị thiếu`,
            );
          }

          const product = await transactionalEntityManager.findOne(Product, {
            where: { id: item.product.id },
            relations: ['variants'],
          });

          if (!product) {
            throw new BadRequestException(
              `Không tìm thấy sản phẩm: ${item.product.name}`,
            );
          }

          // Kiểm tra số lượng tồn kho của sản phẩm hoặc biến thể
          const productVariant = item.variant
            ? product.variants.find((v) => v.id === item.variant?.id)
            : null;

          if (
            (productVariant && productVariant.stock < item.quantity) ||
            (productVariant === null && product.stock < item.quantity)
          ) {
            throw new BadRequestException(
              `Không đủ số lượng cho sản phẩm ${product.name}`,
            );
          }

          // Cập nhật tồn kho
          if (productVariant) {
            productVariant.stock -= item.quantity;
            await transactionalEntityManager.save(productVariant);
          } else {
            product.stock -= item.quantity;
            await transactionalEntityManager.save(product);
          }

          // Lưu thông tin đơn hàng
          const imagePath = item.product.assets?.[0]?.asset?.path || null;
          const orderItem = this.orderItemRepository.create({
            order: savedOrder,
            product,
            quantity: item.quantity,
            price: item.price,
            name: item.product.name,
            image: imagePath,
            variant: item.variant ?? undefined,
          });
          await transactionalEntityManager.save(orderItem);
        }

        // Xóa giỏ hàng nếu thanh toán COD
        if (checkoutDto.payment_method === PaymentMethod.COD) {
          await transactionalEntityManager.delete(CartItem, {
            cart: { id: cart.id },
          });
          await transactionalEntityManager.delete(Cart, { id: cart.id });
        }

        // Xử lý thanh toán qua ngân hàng (VNPAY hoặc các cổng khác)
        if (checkoutDto.payment_method === PaymentMethod.BANK_TRANSFER) {
          return this.vnpayService.createPaymentUrl(
            {
              orderInfo: savedOrder.id.toString(),
              amount: Number(savedOrder.total + savedOrder.shipping_fee),
              orderId: savedOrder.id.toString(),
            },
            ipAddr,
          );
        }

        return { order: savedOrder };
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
