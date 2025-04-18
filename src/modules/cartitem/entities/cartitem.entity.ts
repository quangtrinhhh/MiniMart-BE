import { Cart } from 'src/modules/cart/entities/cart.entity';
import { ProductVariant } from 'src/modules/product-variant/entities/product-variant.entity';
import { Product } from 'src/modules/product/entities/product.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('cartitem')
export class CartItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Cart, (cart) => cart.cartItems)
  @JoinColumn({ name: 'Cart_id' })
  cart: Cart;

  @ManyToOne(() => Product, (product) => product.cartItems, { nullable: true })
  @JoinColumn({ name: 'Product_id' })
  product: Product | null;

  @ManyToOne(() => ProductVariant, (variant) => variant.cartItems, {
    nullable: true,
  })
  @JoinColumn({ name: 'Variant_id' })
  variant: ProductVariant | null; // Nếu sản phẩm có biến thể, lưu ở đây

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
