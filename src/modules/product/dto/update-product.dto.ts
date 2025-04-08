import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductVariantDto {
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsNumber()
  @IsOptional()
  old_price?: number;

  @IsNumber()
  @IsOptional()
  stock?: number;

  @IsOptional()
  created_at?: Date;
}

export class UpdateProductDto {
  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  slug?: string; // ✅ THÊM slug VÀO DTO

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  discount?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  stock?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  sold?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsNumber({}, { each: true })
  productCategories: number[];

  @IsBoolean()
  @IsOptional()
  status?: boolean;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductVariantDto)
  @IsOptional()
  variants?: UpdateProductVariantDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductAttributeDto)
  @IsOptional()
  attributes?: UpdateProductAttributeDto[];
}
export class UpdateProductAttributeDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  created_at?: Date;
}
