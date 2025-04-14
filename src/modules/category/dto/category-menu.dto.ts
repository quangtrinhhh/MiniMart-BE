// category-menu.dto.ts
import { Expose, Type } from 'class-transformer';

export class CategoryMenuDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  image: string;

  @Expose()
  @Type(() => CategoryMenuDto)
  children?: CategoryMenuDto[];
}
