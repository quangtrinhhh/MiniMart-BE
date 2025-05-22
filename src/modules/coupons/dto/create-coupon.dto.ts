import { IsEnum, IsDateString, IsNumber, IsString, Min } from 'class-validator';
import { CouponType, CouponStatus } from '../entities/coupon.entity';

export class CreateCouponDto {
  @IsString()
  coupon_code: string;

  @IsEnum(CouponType)
  coupon_type: CouponType;

  @IsNumber()
  @Min(0)
  coupon_value: number;

  @IsDateString()
  coupon_start_date: string;

  @IsDateString()
  coupon_end_date: string;

  @IsNumber()
  @Min(0)
  coupon_min_spend: number;

  @IsNumber()
  @Min(0)
  coupon_max_spend: number;

  @IsNumber()
  @Min(1)
  coupon_uses_per_customer: number;

  @IsNumber()
  @Min(1)
  coupon_uses_per_coupon: number;

  @IsEnum(CouponStatus)
  coupon_status: CouponStatus;
}
