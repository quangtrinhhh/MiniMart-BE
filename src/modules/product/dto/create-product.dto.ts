import {
  IsDecimal,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsDecimal()
  price: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDecimal()
  @IsOptional()
  discount?: number;

  @IsNotEmpty()
  quantity: number;

  @IsOptional()
  sold?: number;

  @IsNotEmpty()
  category_id: number;
}
