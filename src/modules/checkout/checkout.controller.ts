import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { GetUser } from 'src/decorator/user.decorator';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { Request } from 'express';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  async checkout(
    @GetUser('_id') userId: number,
    @Body() checkoutDto: CreateCheckoutDto,
    @Req() req: Request,
  ) {
    const ipAddr = (
      req.headers['x-forwarded-for']?.toString() ||
      req.ip ||
      req.connection?.remoteAddress ||
      '127.0.0.1'
    )
      .split(',')[0]
      .trim();
    return this.checkoutService.checkout(userId, checkoutDto, ipAddr);
  }

  @Post('confirm/:orderId')
  async confirmVnpayPayment(
    @Param('orderId') orderId: number,
    @Body('transactionStatus') transactionStatus: string,
    @GetUser('_id') userId: number,
  ) {
    return this.checkoutService.confirmVnpayPayment(
      orderId,
      transactionStatus,
      userId,
    );
  }
}
