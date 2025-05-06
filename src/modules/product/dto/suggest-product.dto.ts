// src/modules/product/dto/suggest-product.dto.ts
import { IsInt, IsOptional, Min } from 'class-validator';

export class SuggestProductDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  limit: number = 10; // Mặc định là 10 sản phẩm
}
