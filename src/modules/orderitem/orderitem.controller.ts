import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { OrderitemService } from './orderitem.service';
import { CreateOrderitemDto } from './dto/create-orderitem.dto';
import { UpdateOrderitemDto } from './dto/update-orderitem.dto';

@Controller('orderitem')
export class OrderitemController {
  constructor(private readonly orderitemService: OrderitemService) {}

  @Post()
  create(@Body() createOrderitemDto: CreateOrderitemDto) {
    return this.orderitemService.create(createOrderitemDto);
  }

  @Get()
  findAll() {
    return this.orderitemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderitemService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateOrderitemDto: UpdateOrderitemDto,
  ) {
    return this.orderitemService.update(+id, updateOrderitemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderitemService.remove(+id);
  }
}
