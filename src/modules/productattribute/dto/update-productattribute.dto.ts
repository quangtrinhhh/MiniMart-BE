import { PartialType } from '@nestjs/mapped-types';
import { CreateProductattributeDto } from './create-productattribute.dto';

export class UpdateProductattributeDto extends PartialType(
  CreateProductattributeDto,
) {}
