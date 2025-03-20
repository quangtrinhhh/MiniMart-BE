import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty({ message: 'first_name không được để trống ' })
  first_name: string;

  @IsNotEmpty({ message: 'last_name không được để trống ' })
  last_name: string;

  @IsNotEmpty({ message: 'email không được để trống ' })
  @IsEmail()
  email: string;

  @IsNotEmpty({ message: 'password không được để trống ' })
  password: string;

  @IsNotEmpty({ message: 'phone không được để trống' })
  @Matches(/^(03[2-9]|05[689]|07[06789]|08[1-8]|09[0-9])\d{7}$/, {
    message: 'Số điện thoại không hợp lệ theo các nhà mạng Việt Nam',
  })
  phone_number: string;
}

export class CodeAuthDto {
  @IsNotEmpty({ message: 'id không được để trống ' })
  id: string;

  @IsNotEmpty({ message: 'code không được để trống ' })
  code: string;
}
