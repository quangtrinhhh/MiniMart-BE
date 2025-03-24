import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaymentMethod } from 'src/common/enums/order-status.enum';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsString()
  shipping_address: string;

  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @IsOptional()
  @IsString()
  note?: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  shipping_fee?: number;

  @IsNotEmpty()
  @IsString()
  consignee_name: string;
}
