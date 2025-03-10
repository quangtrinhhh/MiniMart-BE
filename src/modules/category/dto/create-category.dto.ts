import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  slug: string;

  @IsOptional()
  description: string;

  @IsOptional()
  image: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  parentId?: number; // ID của danh mục cha (nếu có)
}
