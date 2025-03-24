import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { RolesGuard } from 'src/auth/passport/roles.guard';
import { Roles } from 'src/decorator/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @Get('stats')
  async getDashboardStats() {
    return this.dashboardService.getDashboardStats();
  }
}
