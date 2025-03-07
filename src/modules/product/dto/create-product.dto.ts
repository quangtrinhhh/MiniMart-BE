import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// 📌 DTO cho thuộc tính sản phẩm
class AttributeDto {
  @IsString()
  name: string;

  @IsString()
  value: string;
}

// 📌 DTO cho giá trị biến thể (lưu thuộc tính của biến thể)
class VariantValueDto {
  @IsString()
  attribute_name: string; // Ex: "Color"

  @IsString()
  value: string; // Ex: "Black"
}

// 📌 DTO cho biến thể sản phẩm (bao gồm giá, stock, SKU)
class VariantDto {
  @IsString()
  name: string;

  @IsNumber()
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  old_price?: number;

  // @IsNotEmpty()
  // @IsString()
  // SKU: string;

  @IsNumber()
  @Type(() => Number)
  stock: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantValueDto)
  values: VariantValueDto[];
}

// 📌 DTO chính cho tạo sản phẩm
export class CreateProductDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsNumber()
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discount?: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  stock: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sold?: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  category_id: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeDto)
  attributes?: AttributeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];
}
