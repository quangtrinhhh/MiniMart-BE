import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  SetMetadata,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { RESPONSE_MESSAGE } from 'src/decorator/customize';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @SetMetadata(RESPONSE_MESSAGE, 'Success')
  @Post()
  create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponsService.create(createCouponDto);
  }

  @SetMetadata(RESPONSE_MESSAGE, 'Success')
  @Get()
  findAll(
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.couponsService.findAll(+current, +pageSize);
  }

  @SetMetadata(RESPONSE_MESSAGE, 'Success')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.couponsService.findOne(+id);
  }

  @SetMetadata(RESPONSE_MESSAGE, 'Success')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCouponDto: UpdateCouponDto) {
    return this.couponsService.update(+id, updateCouponDto);
  }

  @SetMetadata(RESPONSE_MESSAGE, 'Success')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.couponsService.remove(+id);
  }
}
