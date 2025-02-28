// src/auth/passport/jwt-auth.guard.ts

import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorator/customize';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super(); // Bạn không cần truyền gì vào đây, chỉ cần gọi super()
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true; // Bỏ qua xác thực JWT cho các route công khai
    }
    return super.canActivate(context); // Tiến hành xác thực JWT
  }

  handleRequest(err, user, info) {
    console.log(info);

    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(
          'Access token không hợp lệ hoặc không tồn tại ở header',
        )
      );
    }
    console.log('user đã xác thực từ jwt-auth', user);

    return user; // Trả về người dùng sau khi xác thực
  }
}
