import { CartItem } from 'src/modules/cartitem/entities/cartitem.entity';
import { ProductCategory } from 'src/modules/category/entities/product-category.entity';
import { OrderItem } from 'src/modules/orderitem/entities/orderitem.entity';
import { ProductAttribute } from 'src/modules/product-attribute/entities/product-attribute.entity';
import { ProductVariant } from 'src/modules/product-variant/entities/product-variant.entity';
import { ProductAsset } from 'src/modules/productasset/entities/productasset.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('product')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(
    () => ProductCategory,
    (productCategory) => productCategory.product,
    {
      cascade: true,
    },
  )
  productCategories: ProductCategory[];

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', nullable: true, default: 0 })
  discount: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', nullable: true, default: 0 })
  sold: number;

  @Column({ type: 'boolean', default: true })
  status: boolean;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.product)
  orderItems: OrderItem[];

  @OneToMany(() => CartItem, (cartItem) => cartItem.product)
  cartItems: CartItem[]; // Mối quan hệ OneToMany với CartItem

  @OneToMany(() => ProductAsset, (asset) => asset.product, {
    cascade: true,
    eager: true,
  })
  assets: ProductAsset[];
  @OneToMany(() => ProductAttribute, (attribute) => attribute.product, {
    cascade: true,
    eager: false,
  })
  attributes: ProductAttribute[];

  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    eager: false, // Lazy Loading để tối ưu query
  })
  variants: ProductVariant[];
}
