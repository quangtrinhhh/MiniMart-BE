import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  slug: string;

  @IsOptional()
  description: string;

  @IsOptional()
  image: string;
}
