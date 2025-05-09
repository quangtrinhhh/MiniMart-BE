import { Expose } from 'class-transformer';

export class VariantDto {
  @Expose() id: number;
  @Expose() name: string;
  @Expose() price: string;
  @Expose() old_price: string;
  @Expose() stock: number;
  @Expose() SKU: string;
}
