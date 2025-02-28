import { IsEmail, IsNotEmpty } from 'class-validator';

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

  @IsNotEmpty({ message: 'phone_number không được để trống ' })
  phone_number: string;
}

export class CodeAuthDto {
  @IsNotEmpty({ message: 'id không được để trống ' })
  id: string;

  @IsNotEmpty({ message: 'code không được để trống ' })
  code: string;
}
