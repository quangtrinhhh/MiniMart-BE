import {
  IsBoolean,
  IsDateString,
  IsDecimal,
  IsInt,
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
  @MaxLength(45)
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDecimal()
  @IsOptional()
  discount?: number;

  @IsInt()
  quantity: number;

  @IsInt()
  @IsOptional()
  sold?: number;

  @IsBoolean()
  @IsOptional()
  status?: boolean;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;
}
