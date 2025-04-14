import { forwardRef, Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { vnpayConfig } from 'src/config/vnpay.config';
import { CreatePaymentDto } from './dto/create-payment.dto';
import moment from 'moment';
import { CheckoutService } from '../checkout/checkout.service';
import { PaymentStatus } from 'src/common/enums/order-status.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { EmailService } from '../email/email.service';

interface CallbackResult {
  status: 'success' | 'failed' | 'invalid';
  orderId?: string;
  message?: string;
}

@Injectable()
export class VNPayService {
  constructor(
    @Inject(forwardRef(() => CheckoutService))
    private readonly checkoutService: CheckoutService,
    @InjectRepository(Order)
    private readonly ordersService: OrdersService,

    private readonly emailService: EmailService,
  ) {}
  // Tạo URL thanh toán
  async createPaymentUrl(
    createPaymentDto: CreatePaymentDto,
    clientIp: string,
  ): Promise<string> {
    const { orderInfo, amount, orderId } = createPaymentDto;
    console.log('createPaymentUrl check IP: ', clientIp);

    const vnp_Params: Record<string, string | number> = {};
    const orderType = 'other'; // Loại đơn hàng
    const currCode = 'VND';
    // Thêm thời gian giao dịch
    const date = new Date();
    const createDate = moment(date).format('YYYYMMDDHHmmss');
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = vnpayConfig.vnp_TmnCode;
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_OrderInfo'] = orderInfo;
    vnp_Params['vnp_CurrCode'] = currCode;
    vnp_Params['vnp_OrderType'] = orderType;
    vnp_Params['vnp_Amount'] = (amount * 100).toString();
    vnp_Params['vnp_TxnRef'] = orderId; // Mã giao dịch độc nhất
    vnp_Params['vnp_ReturnUrl'] = 'http://localhost:3000/checkout/payment';
    vnp_Params['vnp_IpAddr'] = clientIp; // Hoặc lấy từ request của người dùng
    vnp_Params['vnp_CreateDate'] = createDate;

    // Thêm chữ ký (signature)
    const vnp_SecureHash = this.generateSignature(vnp_Params);
    vnp_Params['vnp_SecureHash'] = vnp_SecureHash;

    // Tạo URL yêu cầu thanh toán
    const queryString = new URLSearchParams(
      Object.entries(vnp_Params).map(([key, value]) => [key, value.toString()]),
    ).toString();

    const paymentUrl = `${vnpayConfig.vnp_Url}?${queryString}`;
    return Promise.resolve(paymentUrl); // Đảm bảo trả về Promise
  }

  // Xử lý callback từ VNPAY
  async handleCallback(
    queryParams: Record<string, string>,
  ): Promise<CallbackResult> {
    try {
      const secureHash = queryParams['vnp_SecureHash'];
      delete queryParams['vnp_SecureHash']; // ❗️Loại bỏ để kiểm tra chữ ký

      const generatedSecureHash = this.generateSignature(queryParams);

      if (secureHash !== generatedSecureHash) {
        console.error('❌ [VNPay] Signature mismatch:', {
          secureHash,
          generatedSecureHash,
        });
        return { status: 'invalid', message: 'Chữ ký không hợp lệ' };
      }

      // 📌 Kiểm tra trạng thái giao dịch
      const orderId = queryParams['vnp_TxnRef'];
      const transactionStatus = queryParams['vnp_TransactionStatus'];

      if (!orderId) {
        console.error('⚠️ [VNPay] Thiếu orderId trong callback:', queryParams);
        return { status: 'invalid', message: 'Thiếu orderId' };
      }

      // 🔍 Tìm đơn hàng trong database
      const order = await this.ordersService.getOrderById(Number(orderId));

      if (!order) {
        console.error('❌ [VNPay] Không tìm thấy đơn hàng:', orderId);
        return { status: 'invalid', message: 'Đơn hàng không tồn tại' };
      }

      if (transactionStatus === '00') {
        console.log('✅ [VNPay] Thanh toán thành công:', orderId);

        await this.checkoutService.updateOrderStatus(
          orderId,
          PaymentStatus.PAID,
        );
        await this.checkoutService.confirmVnpayPayment(
          Number(orderId),
          transactionStatus,
          Number(order.user.id),
        );

        await this.emailService.sendOrderConfirmationEmail(
          order, // Đã có order từ createOrderAndItems
          order.user.email || '', // Địa chỉ email của người dùng
        );

        return { status: 'success', orderId };
      } else {
        console.warn('⚠️ [VNPay] Thanh toán thất bại:', orderId);
        await this.ordersService.deleteOrder(Number(orderId));
        return { status: 'failed', orderId };
      }
    } catch (error) {
      console.error('❌ [VNPay] Lỗi xử lý callback:', error);
      return {
        status: 'invalid',
        message: error instanceof Error ? error.message : 'Lỗi không xác định',
      };
    }
  }

  // Tạo chữ ký từ các tham số
  private generateSignature(
    vnp_Params: Record<string, string | number>,
  ): string {
    const secretKey = vnpayConfig.vnp_HashSecret;

    // ❗️ Xóa `vnp_SecureHash` trước khi tạo chữ ký
    delete vnp_Params['vnp_SecureHash'];

    // ❗️ Sắp xếp tham số theo thứ tự alphabet (quan trọng)
    const sortedKeys = Object.keys(vnp_Params).sort();
    const queryString = sortedKeys
      .map((key) => `${key}=${encodeURIComponent(vnp_Params[key].toString())}`)
      .join('&');

    // ❗️ Sử dụng SHA512 để tạo chữ ký
    const generatedSecureHash = crypto
      .createHmac('sha512', secretKey)
      .update(queryString)
      .digest('hex');
    return generatedSecureHash;
  }
}
