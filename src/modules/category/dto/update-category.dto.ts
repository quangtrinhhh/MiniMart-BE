import { IsOptional } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  name: string;

  @IsOptional()
  description: string;

  @IsOptional()
  image: string;

  @IsOptional()
  slug: string;
}
