import { RoleEnum } from 'src/common/enums/role.enum';

export interface AuthUser {
  _id: string;
  username: string;
  role: RoleEnum;
}
