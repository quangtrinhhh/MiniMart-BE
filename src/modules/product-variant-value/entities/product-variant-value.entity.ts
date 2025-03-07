import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ProductVariant } from 'src/modules/product-variant/entities/product-variant.entity';

@Entity('product_variant_values')
export class ProductVariantValue {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ProductVariant, (variant) => variant.values)
  variant: ProductVariant;

  @Column({ type: 'varchar', length: 255 })
  attribute_name: string; // Ex: "Color", "Storage"

  @Column({ type: 'varchar', length: 255 })
  value: string; // Ex: "Black", "512GB SSD"
}
