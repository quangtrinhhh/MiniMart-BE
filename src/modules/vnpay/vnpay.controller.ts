import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Request } from 'express';
import { Public, responseMessage } from 'src/decorator/customize';
import { VNPayService } from './vnpay.service';
import { OrdersService } from '../orders/orders.service';

@Controller('vnpay')
export class VNPayController {
  constructor(
    private readonly vnpayService: VNPayService,
    private readonly ordersService: OrdersService,
  ) {}
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

      const paymentUrl: string = await this.vnpayService.createPaymentUrl(
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
  @Public()
  @responseMessage('Xử lý kết quả thanh toán VNPAY')
  @Get('vnpay-return')
  async handleVnpayReturn(@Query() queryParams: Record<string, string>) {
    console.log('🔍 Query Params từ FE gửi đến BE:', queryParams); // Debug
    try {
      const result = await this.vnpayService.handleCallback(queryParams);

      if (result.status === 'success') {
        const order = await this.ordersService.getOrderById(
          Number(result.orderId),
        );

        return {
          status: 'success',
          message: 'Thanh toán thành công',
          order,
        };
      }

      if (result.status === 'failed') {
        return {
          status: 'failed',
          message: 'Thanh toán thất bại',
          orderId: result.orderId,
        };
      }

      return {
        status: 'invalid',
        message: result.message || 'Chữ ký không hợp lệ',
      };
    } catch (error) {
      console.error('❌ Lỗi khi xử lý callback VNPAY:', error);

      throw new HttpException(
        {
          status: 'error',
          message: 'Lỗi trong quá trình xử lý callback từ VNPAY',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
