import { Asset } from 'src/modules/assets/entities/asset.entity';
import { Product } from 'src/modules/product/entities/product.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('product_asset') // Tên bảng trong database
export class ProductAsset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  type: string;

  @ManyToOne(() => Asset, (asset) => asset.id, { eager: true })
  @JoinColumn({ name: 'Assets_id' })
  asset: Asset;

  @ManyToOne(() => Product, (product) => product.id)
  @JoinColumn({ name: 'Product_id' })
  product: Product;

  @DeleteDateColumn()
  deletedAt: Date;
}
