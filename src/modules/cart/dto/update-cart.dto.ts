import { PartialType } from '@nestjs/mapped-types';
import { CreateCartDto } from './cart.dto';

export class UpdateCartDto extends PartialType(CreateCartDto) {}
