import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateCartDto {}
export class AddToCartDto {
  @IsInt({ message: 'ID sản phẩm phải là số nguyên' })
  @Type(() => Number)
  productId: number;

  @IsOptional()
  @IsInt({ message: 'ID biến thể phải là số nguyên' })
  @Type(() => Number)
  variantId?: number;

  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn hoặc bằng 1' })
  @Type(() => Number)
  quantity: number;
}
