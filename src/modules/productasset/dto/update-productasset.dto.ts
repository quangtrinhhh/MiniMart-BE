import { PartialType } from '@nestjs/mapped-types';
import { CreateProductassetDto } from './create-productasset.dto';

export class UpdateProductassetDto extends PartialType(CreateProductassetDto) {}
