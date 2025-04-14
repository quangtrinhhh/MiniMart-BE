import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Order } from 'src/modules/orders/entities/order.entity';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendOrderConfirmationEmail(order: Order, email: string): Promise<void> {
    if (!email) {
      console.warn(
        '[EmailService] Thiếu email người dùng để gửi xác nhận đơn hàng.',
      );
      return;
    }
    console.log('???>>>>>>>>>>>>>>', email);

    await this.mailerService.sendMail({
      to: email,
      subject: 'Xác nhận đơn hàng tại EGA Mini Mart',
      template: 'payment-confirmation',
      context: {
        customerName: order?.consignee_name || email,
        transactionTime: new Date().toLocaleString('vi-VN'),
        paymentMethod: `${order?.payment_method}`,
        items: order.orderItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price.toLocaleString('vi-VN'),
          totalPrice: (item.quantity * item.price).toLocaleString('vi-VN'),
          image: item.image || 'https://via.placeholder.com/60',
        })),
        discount: '0',
        vat: '0',
        totalAmount: (order.total + order.shipping_fee).toLocaleString('vi-VN'),
        year: new Date().getFullYear(),
      },
    });
  }
}
