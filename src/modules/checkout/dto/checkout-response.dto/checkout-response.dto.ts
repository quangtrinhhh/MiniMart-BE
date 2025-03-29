import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { PaymentMethod } from 'src/common/enums/order-status.enum';

export class CheckoutDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsNotEmpty()
  shippingAddress: string;
}
export class ConfirmPaymentDto {
  @IsString()
  @IsNotEmpty()
  transactionStatus: string;

  @IsNotEmpty()
  userId: number;
}
