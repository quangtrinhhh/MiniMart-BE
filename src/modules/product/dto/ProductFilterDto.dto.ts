import { Transform } from 'class-transformer';
import { IsOptional, IsArray, IsNumber, IsString } from 'class-validator';

export class ProductFilterDto {
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map(String) : [String(value)],
  )
  priceRanges?: string[]; // e.g., ['10000-50000', '100000-500000']

  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map(String) : [String(value)],
  )
  colors?: string[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map(String) : [String(value)],
  )
  productTypes?: string[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map(String) : [String(value)],
  )
  tags?: string[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map(Number) : [Number(value)],
  )
  categoryIds?: number[];

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  pageSize?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  current?: number;
}
