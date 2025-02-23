import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum CouponType {
  PERCENT = 'percent',
  FIXED_AMOUNT = 'fixed_amount',
}

export enum CouponStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DISABLED = 'disabled',
}

@Entity('coupon')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  coupon_code: string;

  @Column({
    type: 'enum',
    enum: CouponType,
  })
  coupon_type: CouponType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  coupon_value: number;

  @Column({ type: 'date' })
  coupon_start_date: string;

  @Column({ type: 'date' })
  coupon_end_date: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  coupon_min_spend: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  coupon_max_spend: number;

  @Column({ type: 'int' })
  coupon_uses_per_customer: number;

  @Column({ type: 'int' })
  coupon_uses_per_coupon: number;

  @Column({
    type: 'enum',
    enum: CouponStatus,
  })
  coupon_status: CouponStatus;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at: Date;
}
