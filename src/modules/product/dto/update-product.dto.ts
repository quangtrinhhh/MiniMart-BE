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

  @IsNumber()
  @IsOptional()
  old_price?: number;

  @IsNumber()
  @IsOptional()
  stock?: number;
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
  category_ids: number[];

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
}
