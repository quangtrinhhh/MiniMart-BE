import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Product } from 'src/modules/product/entities/product.entity';
import { ProductVariantValue } from 'src/modules/product-variant-value/entities/product-variant-value.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, (product) => product.variants)
  product: Product;

  @Column({ type: 'varchar', length: 255 })
  name: string; // Ex: "Màu Đen - 512GB"

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // Giá của biến thể

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  old_price: number; // Giá gốc (nếu có)

  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  SKU: string; // Mã sản phẩm riêng biệt

  @Column({ type: 'int', default: 0 })
  stock: number; // Số lượng tồn kho

  @OneToMany(
    () => ProductVariantValue,
    (variantValue) => variantValue.variant,
    {
      cascade: true,
      eager: false, // Lazy Load
    },
  )
  values: ProductVariantValue[];

  @CreateDateColumn()
  created_at: Date;
}
