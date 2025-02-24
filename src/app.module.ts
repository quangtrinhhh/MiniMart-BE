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
import { ProductattributeModule } from './modules/productattribute/productattribute.module';
import { AttributesModule } from './modules/attributes/attributes.module';
import { ReviewModule } from './modules/review/review.module';
import { Review } from './modules/review/entities/review.entity';
import { ProductAsset } from './modules/productasset/entities/productasset.entity';
import { ProductAttribute } from './modules/productattribute/entities/productattribute.entity';
import { Attribute } from './modules/attributes/entities/attribute.entity';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/passport/jwt-auth.guard';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
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
      Attribute,
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
    ProductattributeModule,
    AttributesModule,
    ReviewModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
