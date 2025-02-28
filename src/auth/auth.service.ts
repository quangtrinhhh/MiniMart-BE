import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { comparePasswordHelper } from 'src/helpers/util';
import { User } from 'src/modules/users/entities/user.entity';
import { UsersService } from 'src/modules/users/users.service';
import { CodeAuthDto, CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials'); // Thêm kiểm tra nếu không tìm thấy người dùng
    }
    const isValidPassword = await comparePasswordHelper(pass, user.password);

    if (!user || !isValidPassword) return null;
    return user;
  }

  login(user: User) {
    const payload = { username: user.email, sub: user.id, role: user.role };
    return {
      user: {
        id: user.id,
        name: `${user.first_name + ' ' + user.last_name}`,
        email: user.email,
      },
      access_token: this.jwtService.sign(payload),
    };
  }

  handleRegister = async (registerDTO: CreateAuthDto) => {
    return await this.usersService.handleRegister(registerDTO);
  };

  checkCode = async (data: CodeAuthDto) => {
    return await this.usersService.handleActive(data);
  };

  retryActive = async (data: string) => {
    return await this.usersService.retryActive(data);
  };
}
