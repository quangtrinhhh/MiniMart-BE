import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Request } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // API tạo yêu cầu thanh toán
  @Post('create')
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() req: Request,
  ) {
    try {
      const ipAddr = (
        req.headers['x-forwarded-for']?.toString() ||
        req.ip ||
        req.connection?.remoteAddress ||
        '127.0.0.1'
      )
        .split(',')[0]
        .trim();

      const paymentUrl: string = await this.paymentService.createPaymentUrl(
        createPaymentDto,
        ipAddr,
      );
      return {
        paymentUrl,
      };
    } catch (error: unknown) {
      return {
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // API nhận kết quả callback từ VNPAY
  @Get('vnpay-return')
  async handleVnpayReturn(@Query() queryParams: Record<string, string>) {
    try {
      const result = await this.paymentService.handleCallback(queryParams);

      // Xử lý kết quả callback từ VNPAY
      if (result.status === 'success') {
        return {
          status: 'success',
          message: 'Thanh toán thành công',
          orderId: result.orderId,
        };
      } else if (result.status === 'failed') {
        return {
          status: 'failed',
          message: 'Thanh toán thất bại',
          orderId: result.orderId,
        };
      } else {
        return {
          status: 'invalid',
          message: result.message || 'Chữ ký không hợp lệ',
        };
      }
    } catch (error: unknown) {
      return {
        status: 'error',
        message: 'Lỗi khi xử lý callback từ VNPAY',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
