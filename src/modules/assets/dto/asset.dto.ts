import { Expose, Type } from 'class-transformer';

export class AssetFileDto {
  @Expose() id: number;
  @Expose() path: string;
}

export class AssetDto {
  @Expose() id: number; // Chỉ expose id
  @Expose() @Type(() => AssetFileDto) asset: AssetFileDto; // Expose asset mà không chứa thêm dữ liệu không cần thiết
}
