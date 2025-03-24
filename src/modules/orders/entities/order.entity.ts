import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from 'src/common/enums/order-status.enum';
import { OrderItem } from 'src/modules/orderitem/entities/orderitem.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

@Entity('order')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  shipping_fee: number;

  @Column({ type: 'text' })
  shipping_address: string;
  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.COD })
  payment_method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  payment_status: PaymentStatus;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'varchar', length: 255 })
  consignee_name: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  total: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  canceled_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  delivery_at: Date;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'Users_id' })
  user: User;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  orderItems: OrderItem[];
}
