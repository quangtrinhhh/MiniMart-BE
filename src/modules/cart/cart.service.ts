import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddToCartDto } from './dto/cart.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { DataSource, IsNull, Repository } from 'typeorm';
import { CartItem } from '../cartitem/entities/cartitem.entity';
import { Product } from '../product/entities/product.entity';
import { ProductVariant } from '../product-variant/entities/product-variant.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product) private productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    private readonly dataSource: DataSource,
  ) {}

  async addToCart(
    userId: number,
    addToCartDto: AddToCartDto,
  ): Promise<CartItem> {
    const { productId, variantId, quantity } = addToCartDto;

    return await this.dataSource.transaction(async (manager) => {
      let product: Product | null = null;
      let variant: ProductVariant | null = null;
      let price = 0;

      if (variantId) {
        // Tìm ProductVariant
        variant = await manager.findOne(ProductVariant, {
          where: { id: variantId },
          relations: ['product'],
        });

        if (!variant)
          throw new NotFoundException('Biến thể sản phẩm không tồn tại');

        if (quantity > variant.stock)
          throw new BadRequestException('Không đủ hàng trong kho');

        product = variant.product;
        price = variant.price;
      } else {
        // Tìm Product
        product = await manager.findOne(Product, { where: { id: productId } });

        if (!product) throw new NotFoundException('Sản phẩm không tồn tại');

        if (quantity > product.stock)
          throw new BadRequestException('Không đủ hàng trong kho');

        price = product.price;
      }

      // Kiểm tra giỏ hàng của user
      let cart = await manager.findOne(Cart, {
        where: { user: { id: userId } },
      });

      if (!cart) {
        cart = manager.create(Cart, { user: { id: userId } });
        await manager.save(cart);
      }

      // Tìm CartItem
      let cartItem = await manager.findOne(CartItem, {
        where: {
          cart: { id: cart.id },
          product: { id: product.id },
          variant: variant ? { id: variant.id } : IsNull(),
        },
      });

      if (cartItem) {
        cartItem.quantity += quantity;
      } else {
        cartItem = manager.create(CartItem, {
          cart,
          product,
          variant,
          quantity,
          price,
        });
      }

      return await manager.save(cartItem);
    });
  }

  async getAllCart(
    userId: number,
  ): Promise<{ cart: Cart | null; totalPrice: number }> {
    const cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      relations: [
        'cartItems',
        'cartItems.product',
        'cartItems.variant',
        'cartItems.product.assets',
      ],
      select: {
        id: true,
        cartItems: {
          id: true,
          quantity: true,
          price: true,
          product: {
            id: true,
            name: true,
            assets: true, // Lấy tất cả ảnh nhưng sẽ lọc lấy ảnh đầu tiên sau đó
          },
          variant: {
            id: true,
            name: true,
          },
        },
      },
    });

    let totalPrice = 0;

    if (cart) {
      cart.cartItems.forEach((item) => {
        // Giữ lại ảnh đầu tiên
        if (item.product?.assets?.length) {
          item.product.assets = [item.product.assets[0]];
        }

        // Tính tổng tiền: số lượng * giá sản phẩm
        totalPrice += item.quantity * Number(item.price);
      });
    }

    return { cart, totalPrice };
  }

  async removeFromCart(userId: number, cartItemId: number): Promise<string> {
    const cartItem = await this.cartItemRepository.findOne({
      where: {
        id: cartItemId,
        cart: { user: { id: userId } },
      },
      relations: ['cart', 'product', 'variant'],
    });

    if (!cartItem) {
      throw new NotFoundException('Sản phẩm không tồn tại trong giỏ hàng');
    }

    // Lưu tên sản phẩm trước khi xóa để trả về
    const productName = cartItem.product?.name || 'Sản phẩm';

    // Xóa cartItem
    await this.cartItemRepository.delete(cartItemId);

    return `Xóa thành công ${productName}`;
  }
  async updateCartItemQuantity(
    userId: number,
    cartItemId: number,
    quantity: number,
  ): Promise<{ quantity: number }> {
    if (quantity < 1) {
      throw new BadRequestException('Số lượng sản phẩm phải lớn hơn 0');
    }

    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId, cart: { user: { id: userId } } },
      relations: ['product', 'variant'],
    });

    if (!cartItem) {
      throw new NotFoundException('Sản phẩm không tồn tại trong giỏ hàng');
    }

    // Kiểm tra tồn kho đúng theo biến thể hoặc sản phẩm chính
    const availableStock =
      cartItem.variant?.stock ?? cartItem.product?.stock ?? 0;

    if (quantity > availableStock) {
      throw new BadRequestException('Số lượng sản phẩm vượt quá tồn kho');
    }

    // Cập nhật số lượng sản phẩm trong giỏ hàng
    cartItem.quantity = quantity;
    await this.cartItemRepository.save(cartItem);

    return { quantity: cartItem.quantity };
  }
}
