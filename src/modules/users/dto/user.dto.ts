import { Expose } from 'class-transformer';

export class UserDto {
  @Expose() id: number;

  @Expose() first_name: string;

  @Expose() last_name: string;

  @Expose() email: string;

  @Expose() role: string; // Thêm trường role để phân quyền

  @Expose() address: string;

  @Expose() city: string;

  @Expose() state: string;

  @Expose() country: string;

  @Expose() phone_number: string;

  //   @Expose() code: string;

  isActive: boolean;
  constructor(partial: Partial<UserDto>) {
    Object.assign(this, partial);
  }
}
