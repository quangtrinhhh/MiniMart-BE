import { PartialType } from '@nestjs/mapped-types';
import { CreateProductVariantValueDto } from './create-product-variant-value.dto';

export class UpdateProductVariantValueDto extends PartialType(CreateProductVariantValueDto) {}
