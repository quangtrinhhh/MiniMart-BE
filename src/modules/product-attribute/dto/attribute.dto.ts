import { Expose } from 'class-transformer';

export class AttributeDto {
  @Expose() name: string;
  @Expose() value: string;
}
