import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { vnpayConfig } from 'src/config/vnpay.config';
import { CreatePaymentDto } from './dto/create-payment.dto';
import moment from 'moment';

interface CallbackResult {
  status: 'success' | 'failed' | 'invalid';
  orderId?: string;
  message?: string;
}

@Injectable()
export class PaymentService {
  // Tạo URL thanh toán
  async createPaymentUrl(
    createPaymentDto: CreatePaymentDto,
    clientIp: string,
  ): Promise<string> {
    const { orderInfo, amount, orderId } = createPaymentDto;

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
    vnp_Params['vnp_ReturnUrl'] = 'https://ega-mini-mart.mysapo.net/checkout';
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
  handleCallback(queryParams: Record<string, string>): Promise<CallbackResult> {
    try {
      const secureHash = queryParams['vnp_SecureHash'];
      delete queryParams['vnp_SecureHash']; // Loại bỏ để tạo chữ ký mới

      const generatedSecureHash = this.generateSignature(queryParams);

      if (secureHash !== generatedSecureHash) {
        console.error('❌ Signature mismatch:', {
          secureHash,
          generatedSecureHash,
        });
        throw new Error('Invalid signature');
      }

      // Kiểm tra trạng thái giao dịch
      const orderId = queryParams['vnp_TxnRef'];
      const transactionStatus = queryParams['vnp_TransactionStatus'];

      if (transactionStatus === '00') {
        console.log('✅ Payment successful for order:', orderId);
        return Promise.resolve({ status: 'success', orderId });
      } else {
        console.warn('⚠️ Payment failed for order:', orderId);
        return Promise.resolve({ status: 'failed', orderId });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error in handleCallback:', errorMessage);
      return Promise.resolve({ status: 'invalid', message: errorMessage });
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

    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    console.log('Query String for Hash:', queryString);
    console.log('Generated Secure Hash:', generatedSecureHash);

    return generatedSecureHash;
  }
}
