import { Asset } from 'src/modules/assets/entities/asset.entity';
import { Attribute } from 'src/modules/attributes/entities/attribute.entity';
import { Product } from 'src/modules/product/entities/product.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('product_attributes') // Tên bảng trong database
export class ProductAttribute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  value: string;

  @ManyToOne(() => Attribute, (attribute) => attribute.id, { eager: true })
  @JoinColumn({ name: 'Attributes_id' })
  attribute: Attribute;

  @ManyToOne(() => Asset, (asset) => asset.id, { eager: true })
  @JoinColumn({ name: 'Assets_id' })
  asset: Asset;

  @ManyToOne(() => Product, (product) => product.id, { eager: true })
  @JoinColumn({ name: 'Product_id' })
  product: Product;
}
