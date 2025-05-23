import { Order } from 'src/modules/orders/entities/order.entity';
import { ProductVariant } from 'src/modules/product-variant/entities/product-variant.entity';
import { Product } from 'src/modules/product/entities/product.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('orderitem')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, (product) => product.orderItems)
  @JoinColumn({ name: 'Product_id' })
  product: Product;

  @ManyToOne(() => ProductVariant, { nullable: true }) // Thêm quan hệ với biến thể
  @JoinColumn({ name: 'ProductVariant_id' })
  variant?: ProductVariant;

  @ManyToOne(() => Order, (order) => order.orderItems)
  @JoinColumn({ name: 'Order_id' })
  order: Order;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'int', nullable: true })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at: Date;
}
