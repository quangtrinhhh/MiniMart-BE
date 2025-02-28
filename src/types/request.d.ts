import { RoleEnum } from 'src/common/enums/role.enum';

// Mở rộng kiểu `Request` của Express
declare global {
  namespace Express {
    interface Request {
      user: {
        _id: string;
        username: string;
        role: RoleEnum;
      };
    }
  }
}
