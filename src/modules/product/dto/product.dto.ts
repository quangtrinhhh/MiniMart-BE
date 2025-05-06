import { Expose, Type } from 'class-transformer';
import { AssetDto } from 'src/modules/assets/dto/asset.dto';
import { CategoryDto } from 'src/modules/category/dto/category.dto';
import { AttributeDto } from 'src/modules/product-attribute/dto/attribute.dto';
import { VariantDto } from 'src/modules/product-variant/dto/variant.dto';

export class ProductDetailDto {
  @Expose() id: number;
  @Expose() name: string;
  @Expose() price: number;
  @Expose() price_old: number;
  @Expose() slug: string;
  @Expose() description: string;
  @Expose() discount: number;
  @Expose() stock: number;
  @Expose() sold: number;
  @Expose() status: boolean;
  @Expose() featured: boolean;

  @Expose() @Type(() => CategoryDto) categories: CategoryDto[];
  @Expose() @Type(() => AssetDto) assets: AssetDto[];
  @Expose() @Type(() => VariantDto) variants: VariantDto[];
  @Expose() @Type(() => AttributeDto) attributes: AttributeDto[];
}
