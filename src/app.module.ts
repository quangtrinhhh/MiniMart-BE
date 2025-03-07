import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './database/database.config';
import { CouponsModule } from './modules/coupons/coupons.module';
import { Coupon } from './modules/coupons/entities/coupon.entity';
import { UsersModule } from './modules/users/users.module';
import { User } from './modules/users/entities/user.entity';
import { ProductModule } from './modules/product/product.module';
import { Product } from './modules/product/entities/product.entity';
import { CategoryModule } from './modules/category/category.module';
import { Category } from './modules/category/entities/category.entity';
import { OrdersModule } from './modules/orders/orders.module';
import { Order } from './modules/orders/entities/order.entity';
import { OrderitemModule } from './modules/orderitem/orderitem.module';
import { OrderItem } from './modules/orderitem/entities/orderitem.entity';
import { CartModule } from './modules/cart/cart.module';
import { Cart } from './modules/cart/entities/cart.entity';
import { CartitemModule } from './modules/cartitem/cartitem.module';
import { CartItem } from './modules/cartitem/entities/cartitem.entity';
import { AssetsModule } from './modules/assets/assets.module';
import { Asset } from './modules/assets/entities/asset.entity';
import { ProductassetModule } from './modules/productasset/productasset.module';
import { ReviewModule } from './modules/review/review.module';
import { Review } from './modules/review/entities/review.entity';
import { ProductAsset } from './modules/productasset/entities/productasset.entity';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './auth/passport/jwt-auth.guard';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { TransformInterceptor } from './core/transform.interceptor';
import { ProductAttributeModule } from './modules/product-attribute/product-attribute.module';
import { ProductAttribute } from './modules/product-attribute/entities/product-attribute.entity';
import { ProductVariantModule } from './modules/product-variant/product-variant.module';
import { ProductVariantValueModule } from './modules/product-variant-value/product-variant-value.module';
import { ProductVariant } from './modules/product-variant/entities/product-variant.entity';
import { ProductVariantValue } from './modules/product-variant-value/entities/product-variant-value.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig()),
    TypeOrmModule.forFeature([
      Coupon,
      User,
      Product,
      Category,
      Order,
      OrderItem,
      Cart,
      CartItem,
      Asset,
      Review,
      ProductAsset,
      ProductAttribute,
      ProductVariant,
      ProductVariantValue,
    ]),
    MailerModule.forRootAsync({
      useFactory: () => ({
        transport: {
          host: process.env.MAILDEV_HOST,
          port: Number(process.env.MAILDEV_PORT),
          // ignoreTLS: true,
          // secure: true,
          auth: {
            user: process.env.MAILDEV_INCOMING_USER,
            pass: process.env.MAILDEV_INCOMING_PASS,
          },
        },
        defaults: {
          from: '"No Reply" <no-reply@localhost>',
        },
        // preview: true,
        template: {
          dir: process.cwd() + '/src/mail/templates/',
          adapter: new HandlebarsAdapter(), // or new PugAdapter() or new EjsAdapter()
          options: {
            strict: true,
          },
        },
      }),
    }),
    CouponsModule,
    UsersModule,
    ProductModule,
    CategoryModule,
    OrdersModule,
    OrderitemModule,
    CartModule,
    CartitemModule,
    AssetsModule,
    ProductassetModule,
    ReviewModule,
    AuthModule,
    ProductAttributeModule,
    ProductVariantModule,
    ProductVariantValueModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
