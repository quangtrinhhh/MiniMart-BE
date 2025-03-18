import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/cart.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/decorator/user.decorator';

@Controller('cart')
@UseGuards(AuthGuard('jwt'))
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  async addToCart(
    @GetUser('_id') userId: number,
    @Body() addToCartDto: AddToCartDto,
  ) {
    return this.cartService.addToCart(userId, addToCartDto);
  }

  @Get()
  async getAllCart(@GetUser('_id') userId: number) {
    return this.cartService.getAllCart(userId);
  }

  @Delete(':cartItemId')
  async removeFromCart(
    @GetUser('_id') userId: number,
    @Param('cartItemId') cartItemId: number,
  ) {
    return this.cartService.removeFromCart(userId, Number(cartItemId));
  }

  @Patch(':cartItemId')
  async updateCartItemQuantity(
    @GetUser('_id') userId: number,
    @Param('cartItemId', ParseIntPipe) cartItemId: number,
    @Body('quantity', ParseIntPipe) quantity: number, // Lấy quantity từ body
  ) {
    return this.cartService.updateCartItemQuantity(
      userId,
      cartItemId,
      quantity,
    );
  }
}
