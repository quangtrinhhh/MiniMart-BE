import { IsNotEmpty } from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty({ message: 'username không được bỏ trống' })
  username: string;

  @IsNotEmpty({ message: 'password không được bỏ trống' })
  password: string;
}
