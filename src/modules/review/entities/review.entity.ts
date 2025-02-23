import { Product } from 'src/modules/product/entities/product.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('reviews') // Tên bảng trong database
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'boolean', default: false })
  is_approved: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date;

  @ManyToOne(() => Product, (product) => product.id, { eager: true })
  @JoinColumn({ name: 'Product_id' })
  product: Product;

  @ManyToOne(() => User, (user) => user.id, { eager: true })
  @JoinColumn({ name: 'Users_id' })
  user: User;
}
